from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from .models import Tournament, Participant, Match
from .serializers import TournamentSerializer, ParticipantSerializer, MatchSerializer
import math

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all().order_by('-created_at')
    serializer_class = TournamentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    # Req #3: Search functionality
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'discipline']

    def perform_create(self, serializer):
        # Req #12: Organizer is the current user
        serializer.save(organizer=self.request.user)

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
            return Response(
                {"error": "Only the organizer can start the tournament"}, 
                status=403
            )
        # 1. Validation
        if tournament.status != 'open':
            return Response({"error": "Tournament is not open"}, status=400)
        
        # Order by Ranking (Seeding) - Req #7
        participants = list(tournament.participants.all().order_by('-ranking_points'))
        count = len(participants)
        
        if count < 2:
            return Response({"error": "Need at least 2 teams to start"}, status=400)

        # 2. Math: Calculate Bracket Size (Next Power of 2)
        # e.g., 5 teams -> Bracket of 8. 14 teams -> Bracket of 16.
        bracket_size = 2 ** math.ceil(math.log2(count))
        
        # 3. Add "Byes" (Dummy/None participants)
        num_byes = bracket_size - count
        seeded_participants = participants + [None] * num_byes

        # 4. Generate Matches Atomic (All or Nothing)
        with transaction.atomic():
            tournament.status = 'ongoing'
            tournament.save()
            
            rounds = int(math.log2(bracket_size))
            matches_by_round = {} 

            # Create Empty Match Objects for all rounds
            for round_num in range(1, rounds + 1):
                matches_in_round = bracket_size // (2 ** round_num)
                matches_by_round[round_num] = []
                
                for i in range(matches_in_round):
                    match = Match.objects.create(
                        tournament=tournament,
                        round_number=round_num,
                        match_number=i
                    )
                    matches_by_round[round_num].append(match)
            
            # 5. Link the Tree (Winner of Match A -> Slot in Match B)
            for round_num in range(1, rounds):
                current_round = matches_by_round[round_num]
                next_round = matches_by_round[round_num + 1]
                
                for i, match in enumerate(current_round):
                    # Logic: Match 0 & 1 feed into Next_Match 0. Match 2 & 3 feed into Next_Match 1.
                    next_match_index = i // 2
                    match.next_match = next_round[next_match_index]
                    match.save()

            # 6. Fill Round 1 with Players
            round_1_matches = matches_by_round[1]
            for i, match in enumerate(round_1_matches):
                # Simple Seeding: 1v2, 3v4, etc.
                p1 = seeded_participants[i * 2]
                p2 = seeded_participants[i * 2 + 1]
                
                if p1: match.player1 = p1.user
                if p2: match.player2 = p2.user
                
                # Handle BYE (Automatic Win)
                if p2 is None and p1 is not None:
                    match.winner = p1.user
                    # Auto-advance to next round
                    if match.next_match:
                        if match.match_number % 2 == 0:
                            match.next_match.player1 = p1.user
                        else:
                            match.next_match.player2 = p1.user
                        match.next_match.save()
                
                match.save()
                
        return Response({"status": "Tournament started", "rounds": rounds})
    
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
            from django.contrib.auth import get_user_model
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

        return Response({"status": "finished", "winner": winner_email})