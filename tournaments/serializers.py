from rest_framework import serializers
from .models import Tournament, Participant, Match,Sponsor
from django.utils import timezone

class SponsorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sponsor
        fields = ['id', 'image']
class ParticipantSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    class Meta:
        model = Participant
        fields = [
            'id', 'user', 'user_email', 'tournament', 
            'team_name', 'license_number', 'ranking_points', 'teammates_names', 
            'registered_at'
        ]
        read_only_fields = ['user', 'registered_at']

    def validate(self, data):
        if Participant.objects.filter(tournament=data['tournament'], license_number=data['license_number']).exists():
            raise serializers.ValidationError("This Summoner Name is already registered in this tournament.")
            
        if Participant.objects.filter(tournament=data['tournament'], team_name=data['team_name']).exists():
            raise serializers.ValidationError("This Team Name is already taken.")
            
        return data

class MatchSerializer(serializers.ModelSerializer):
    player1_email = serializers.ReadOnlyField(source='player1.email')
    player2_email = serializers.ReadOnlyField(source='player2.email')
    winner_email = serializers.ReadOnlyField(source='winner.email')

    class Meta:
        model = Match
        fields = '__all__'

class TournamentSerializer(serializers.ModelSerializer):
    organizer_email = serializers.ReadOnlyField(source='organizer.email')
    matches = MatchSerializer(many=True, read_only=True)
    participants = ParticipantSerializer(many=True, read_only=True)
    sponsors = SponsorSerializer(many=True, read_only=True) 
    
    class Meta:
        model = Tournament
        fields = '__all__'
        read_only_fields = ['organizer', 'status', 'created_at','sponsors']

    # --- NEW VALIDATION ---
    def validate_start_time(self, value):
        if self.instance and self.instance.start_time == value:
            return value

        if value < timezone.now():
            raise serializers.ValidationError("Tournament start time cannot be in the past.")
        
        return value

    def validate(self, data):
        start = data.get('start_time')
        deadline = data.get('deadline')

        if self.instance:
            start = start or self.instance.start_time
            deadline = deadline or self.instance.deadline
        
        if start and deadline and deadline >= start:
            raise serializers.ValidationError({
                "deadline": "Registration deadline must be before the start time."
            })
            
        return data