from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator

class Tournament(models.Model):
    STATUS_CHOICES = (
        ('open', 'Registration Open'),
        ('ongoing', 'Ongoing'),
        ('finished', 'Finished'),
    )
    
    DISCIPLINE_CHOICES = (
        ('5v5_summoners_rift', '5v5 Summoners Rift'),
        ('1v1_howling_abyss', '1v1 Howling Abyss'),
    )

    name = models.CharField(max_length=255)
    discipline = models.CharField(max_length=50, choices=DISCIPLINE_CHOICES)
    # Link to the user who created it (Organizer)
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='organized_tournaments')
    
    # Tournament Details (Req #4)
    start_time = models.DateTimeField()
    location_url = models.URLField(max_length=1000, help_text="Google Maps Embed URL")
    description = models.TextField(blank=True)
    
    # Limits (Req #6)
    max_participants = models.IntegerField(validators=[MinValueValidator(2)])
    deadline = models.DateTimeField(help_text="Registration deadline")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Participant(models.Model):
    """
    Represents a TEAM registration.
    The 'user' field is the Captain.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    
    # Req #5 Mapped to LoL Context:
    team_name = models.CharField(max_length=100, default="Unknown Team")
    license_number = models.CharField(max_length=50, help_text="Captain's Summoner Name (e.g. Faker#KR1)")
    ranking_points = models.IntegerField(default=0, help_text="Team Average MMR/LP")
    
    # Store the roster as a simple text list (The "Hack")
    # Example: "Zeus, Oner, Gumayusi, Keria"
    teammates_names = models.TextField(help_text="Comma-separated list of teammates", blank=True)
    
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'tournament']

    def __str__(self):
        return f"Team {self.team_name} (Capt: {self.user.email})"
class Match(models.Model):
    """
    Req #7 & #8: The Ladder Node.
    """
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    
    # Players (can be null if we are waiting for a previous match to finish)
    player1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_as_p1')
    player2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_as_p2')
    
    player1_vote = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='votes_as_p1', null=True, blank=True, on_delete=models.SET_NULL)
    player2_vote = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='votes_as_p2', null=True, blank=True, on_delete=models.SET_NULL)
    
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='matches_won')
    
    round_number = models.IntegerField()
    match_number = models.IntegerField()
    
    # Pointer to the next match (The Tree Structure)
    next_match = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='previous_matches')

    def __str__(self):
        return f"{self.tournament.name} - R{self.round_number}"