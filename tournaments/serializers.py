from rest_framework import serializers
from .models import Tournament, Participant, Match


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
        # 1. Check unique Summoner Name (Captain)
        if Participant.objects.filter(tournament=data['tournament'], license_number=data['license_number']).exists():
            raise serializers.ValidationError("This Summoner Name is already registered in this tournament.")
            
        # 2. Check unique Team Name
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
    
    class Meta:
        model = Tournament
        fields = '__all__'
        read_only_fields = ['organizer', 'status', 'created_at']

    # --- NEW VALIDATION LOGIC ---
    def validate(self, data):
        # Only check this logic when UPDATING an existing tournament (instance exists)
        if self.instance:
            # If the tournament has started (status is NOT 'open')
            if self.instance.status != 'open':
                
                # Check 1: Prevent Start Time changes
                if 'start_time' in data and data['start_time'] != self.instance.start_time:
                    # Return error in a format the frontend handles ({ "error": "message" })
                    raise serializers.ValidationError({"error": "Cannot edit start time after tournament has started."})
                
                # Check 2: Prevent Deadline changes
                if 'deadline' in data and data['deadline'] != self.instance.deadline:
                    raise serializers.ValidationError({"error": "Cannot edit registration deadline after tournament has started."})
        
        return data