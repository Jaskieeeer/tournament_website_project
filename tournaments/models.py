from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
import math

class Sponsor(models.Model):
    tournament = models.ForeignKey('Tournament', related_name='sponsors', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='sponsor_logos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

class Tournament(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('ongoing', 'Ongoing'),
        ('finished', 'Finished'),
        ('cancelled', 'Cancelled'), # Added cancelled state
    ]
    
    DISCIPLINE_CHOICES = [
        ('5v5_summoners_rift', '5v5 Summoner\'s Rift'),
        ('1v1_howling_abyss', '1v1 Howling Abyss'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    discipline = models.CharField(max_length=50, choices=DISCIPLINE_CHOICES, default='5v5_summoners_rift')
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='organized_tournaments')
    
    start_time = models.DateTimeField()
    deadline = models.DateTimeField()
    max_participants = models.IntegerField(default=16)
    location_url = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    # --- REUSABLE START LOGIC ---
    def start_tournament(self):
        """
        Generates the bracket and starts the tournament.
        Raises ValueError if conditions aren't met.
        """
        if self.status != 'open':
            raise ValueError("Tournament is not open.")

        participants = list(self.participants.all().order_by('-ranking_points'))
        count = len(participants)

        if count < 2:
            raise ValueError("Need at least 2 teams to start.")

        # Calculate Bracket Size (Next Power of 2)
        bracket_size = 2 ** math.ceil(math.log2(count))
        num_byes = bracket_size - count
        seeded_participants = participants + [None] * num_byes
        rounds = int(math.log2(bracket_size))

        with transaction.atomic():
            self.status = 'ongoing'
            self.save()

            matches_by_round = {}

            # 1. Create All Matches
            for round_num in range(1, rounds + 1):
                matches_in_round = bracket_size // (2 ** round_num)
                matches_by_round[round_num] = []
                for i in range(matches_in_round):
                    match = Match.objects.create(
                        tournament=self,
                        round_number=round_num,
                        match_number=i
                    )
                    matches_by_round[round_num].append(match)

            # 2. Link Matches (Advancement Logic)
            for round_num in range(1, rounds):
                current_round = matches_by_round[round_num]
                next_round = matches_by_round[round_num + 1]
                for i, match in enumerate(current_round):
                    match.next_match = next_round[i // 2]
                    match.save()

            # 3. Seed Round 1
            round_1_matches = matches_by_round[1]
            for i, match in enumerate(round_1_matches):
                p1 = seeded_participants[i * 2]
                p2 = seeded_participants[i * 2 + 1]

                if p1: match.player1 = p1.user
                if p2: match.player2 = p2.user

                # Handle BYE (Auto-Win)
                if p2 is None and p1 is not None:
                    match.winner = p1.user
                    if match.next_match:
                        if match.match_number % 2 == 0:
                            match.next_match.player1 = p1.user
                        else:
                            match.next_match.player2 = p1.user
                        match.next_match.save()
                
                match.save()

class Participant(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, related_name='participants', on_delete=models.CASCADE)
    
    team_name = models.CharField(max_length=100, blank=True)
    license_number = models.CharField(max_length=50, blank=True)
    ranking_points = models.IntegerField(default=0)
    teammates_names = models.TextField(blank=True, help_text="Comma-separated names")
    
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'user')

class Match(models.Model):
    tournament = models.ForeignKey(Tournament, related_name='matches', on_delete=models.CASCADE)
    round_number = models.IntegerField()
    match_number = models.IntegerField()
    class Meta:
        # Always sort by Round, then by Match number
        ordering = ['round_number', 'match_number']

        
    player1 = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='matches_as_p1', on_delete=models.SET_NULL, null=True, blank=True)
    player2 = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='matches_as_p2', on_delete=models.SET_NULL, null=True, blank=True)
    
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='matches_won', on_delete=models.SET_NULL, null=True, blank=True)
    next_match = models.ForeignKey('self', related_name='previous_matches', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Voting System
    player1_vote = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='votes_as_p1', on_delete=models.SET_NULL, null=True, blank=True)
    player2_vote = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='votes_as_p2', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.tournament} - R{self.round_number} M{self.match_number}"