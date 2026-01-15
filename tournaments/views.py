from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from .models import Tournament, Participant, Match, Sponsor
from .serializers import TournamentSerializer, ParticipantSerializer, MatchSerializer
import math
from django.contrib.auth import get_user_model # <--- 1. ADD THIS IMPORT
 
class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all().order_by('-created_at')
    serializer_class = TournamentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    # Req #3: Search functionality
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'discipline']

    def perform_create(self, serializer):
        # Req #12: Organizer is the current user
        tournament = serializer.save(organizer=self.request.user)
        
        # 2. Handle Sponsor Images
        images = self.request.FILES.getlist('sponsors')
        for image in images:
            Sponsor.objects.create(tournament=tournament, image=image)
    def perform_update(self, serializer):
        tournament = serializer.save()
        
        # Add NEW images (does not delete old ones)
        images = self.request.FILES.getlist('sponsors')
        for image in images:
            Sponsor.objects.create(tournament=tournament, image=image)

    @action(detail=False, methods=['get'], url_path='history')
    def user_history(self, request):
        """
        GET /api/tournaments/history/?username=faker
        """
        username = request.query_params.get('username')
        
        if not username:
            return Response({"error": "Username parameter is required"}, status=400)

        User = get_user_model()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        # distinct() avoids duplicates
        user_tournaments = Tournament.objects.filter(participants__user=user).distinct()

        # Split into active and past
        active = user_tournaments.filter(status__in=['open', 'ongoing']).order_by('start_time')
        past = user_tournaments.filter(status='finished').order_by('-start_time')

        return Response({
            "username": user.username,
            "active": TournamentSerializer(active, many=True).data,
            "past": TournamentSerializer(past, many=True).data
        })
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        tournament = self.get_object()
        
        # Req #6: Check limits
        if tournament.participants.count() >= tournament.max_participants:
            return Response({"error": "Tournament is full"}, status=400)
            
        # Check deadline
        if timezone.now() > tournament.deadline:
             return Response({"error": "Registration deadline passed"}, status=400)

        # Create participant
        
        serializer = ParticipantSerializer(data={
            'tournament': tournament.id,
            'team_name': request.data.get('team_name'),          # <--- NEW
            'license_number': request.data.get('license_number'),
            'ranking_points': request.data.get('ranking_points'),
            'teammates_names': request.data.get('teammates_names') # <--- NEW
        })
        
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        tournament = self.get_object()
        
        if tournament.organizer != request.user:
            return Response({"error": "Only the organizer can start the tournament"}, status=403)
        
        try:
            # Use the shared logic from models.py
            tournament.start_tournament()
            return Response({"status": "Tournament started successfully"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        
    @action(detail=True, methods=['post'], url_path='matches/(?P<match_id>\d+)/report')
    def report_match(self, request, pk=None, match_id=None):
        """
        Req #8: Both players must agree.
        If conflict -> Withdraw votes, return status 'conflict' (HTTP 200).
        """
        with transaction.atomic():
            # 1. Lock the match row
            match = Match.objects.select_for_update().get(id=match_id, tournament_id=pk)
            
            if match.winner:
                 return Response({"error": "Match already finished"}, status=400)

            winner_email = request.data.get('winner_email')
            
            # 2. Validate Winner Email
            User = get_user_model()
            try:
                winner_obj = User.objects.get(email=winner_email)
            except User.DoesNotExist:
                return Response({"error": "Winner email not found"}, status=400)
            if winner_obj != match.player1 and winner_obj != match.player2:
                return Response({
                    "error": "Invalid Winner. The winner must be one of the match participants."
                }, status=400)
            # 3. Store the Vote
            if match.player1 == request.user:
                match.player1_vote = winner_obj
            elif match.player2 == request.user:
                match.player2_vote = winner_obj
            else:
                return Response({"error": "You are not a participant in this match"}, status=403)
            
            match.save()

            # 4. Check for Consensus
            p1_voted = match.player1_vote
            p2_voted = match.player2_vote

            # CASE A: Waiting for opponent
            if not p1_voted or not p2_voted:
                return Response({
                    "status": "waiting", 
                    "message": "Vote recorded. Waiting for opponent."
                }, status=200)

            # CASE B: Conflict (Requirement #8)
            if p1_voted != p2_voted:
                # Clear the votes (Withdrawal)
                match.player1_vote = None
                match.player2_vote = None
                match.save()
                
                # Return 200 OK but with a 'conflict' status flag
                return Response({
                    "status": "conflict",
                    "message": "Both captains submitted different results. Votes have been reset."
                }, status=200)

            # CASE C: Agreement (Finalize)
            match.winner = p1_voted
            match.save()

            # Advance to Next Bracket Node
            if match.next_match:
                next_match = Match.objects.select_for_update().get(id=match.next_match.id)
                if match.match_number % 2 == 0:
                    next_match.player1 = match.winner
                else:
                    next_match.player2 = match.winner
                next_match.save()
            else:
                # --- AUTO-FINISH LOGIC ---
                # If there is no next match, this was the Final.
                tournament = match.tournament
                tournament.status = 'finished'
                tournament.save()

        return Response({"status": "finished", "winner": winner_email})