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
    
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'discipline']

    def perform_create(self, serializer):
        tournament = serializer.save(organizer=self.request.user)
        
        images = self.request.FILES.getlist('sponsors')
        for image in images:
            Sponsor.objects.create(tournament=tournament, image=image)
    def perform_update(self, serializer):
        tournament = serializer.save()
        
        images = self.request.FILES.getlist('sponsors')
        for image in images:
            Sponsor.objects.create(tournament=tournament, image=image)

    @action(detail=False, methods=['get'], url_path='history')
    def user_history(self, request):

        username = request.query_params.get('username')
        
        if not username:
            return Response({"error": "Username parameter is required"}, status=400)

        User = get_user_model()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        user_tournaments = Tournament.objects.filter(participants__user=user).distinct()

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
        
        if tournament.participants.count() >= tournament.max_participants:
            return Response({"error": "Tournament is full"}, status=400)
            
        if timezone.now() > tournament.deadline:
             return Response({"error": "Registration deadline passed"}, status=400)

        
        serializer = ParticipantSerializer(data={
            'tournament': tournament.id,
            'team_name': request.data.get('team_name'),         
            'license_number': request.data.get('license_number'),
            'ranking_points': request.data.get('ranking_points'),
            'teammates_names': request.data.get('teammates_names') 
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
            tournament.start_tournament()
            return Response({"status": "Tournament started successfully"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        
    @action(detail=True, methods=['post'], url_path='matches/(?P<match_id>\d+)/report')
    def report_match(self, request, pk=None, match_id=None):
        with transaction.atomic():
            match = Match.objects.select_for_update().get(id=match_id, tournament_id=pk)
            
            if match.winner:
                 return Response({"error": "Match already finished"}, status=400)

            winner_email = request.data.get('winner_email')
            
            User = get_user_model()
            try:
                winner_obj = User.objects.get(email=winner_email)
            except User.DoesNotExist:
                return Response({"error": "Winner email not found"}, status=400)
            if winner_obj != match.player1 and winner_obj != match.player2:
                return Response({
                    "error": "Invalid Winner. The winner must be one of the match participants."
                }, status=400)
            if match.player1 == request.user:
                match.player1_vote = winner_obj
            elif match.player2 == request.user:
                match.player2_vote = winner_obj
            else:
                return Response({"error": "You are not a participant in this match"}, status=403)
            
            match.save()

            p1_voted = match.player1_vote
            p2_voted = match.player2_vote

            if not p1_voted or not p2_voted:
                return Response({
                    "status": "waiting", 
                    "message": "Vote recorded. Waiting for opponent."
                }, status=200)

            if p1_voted != p2_voted:
                match.player1_vote = None
                match.player2_vote = None
                match.save()
                
                return Response({
                    "status": "conflict",
                    "message": "Both captains submitted different results. Votes have been reset."
                }, status=200)

            match.winner = p1_voted
            match.save()

            if match.next_match:
                next_match = Match.objects.select_for_update().get(id=match.next_match.id)
                if match.match_number % 2 == 0:
                    next_match.player1 = match.winner
                else:
                    next_match.player2 = match.winner
                next_match.save()
            else:
                tournament = match.tournament
                tournament.status = 'finished'
                tournament.save()

        return Response({"status": "finished", "winner": winner_email})