from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from tournaments.models import Tournament, Participant, Match
from datetime import timedelta

class Command(BaseCommand):
    help = 'Wipes database and seeds demo data with a complete finished tournament history'

    def handle(self, *args, **kwargs):
        self.stdout.write("🌱 Starting Database Seed...")
        
        # 1. WIPE DATA
        self.stdout.write("   - Deleting old data...")
        Match.objects.all().delete()
        Participant.objects.all().delete()
        Tournament.objects.all().delete()
        User = get_user_model()
        # Filter deletes all standard users but keeps your superuser/admin
        User.objects.filter(is_superuser=False).delete() 
        
        # 2. CREATE USERS
        self.stdout.write("   - Creating Users...")
        pw = "passwood12345" 
        
        names = [
            "Faker", "Zeus", "Oner", "Gumayusi", "Keria",      # T1
            "Caps", "Mikyx", "HansSama", "Yike", "BrokenBlade",# G2
            "Chovy", "Canyon", "ShowMaker", "Deft", "BeryL",   # LCK Stars
            "Rekkles", "Jankos", "Perkz", "Elyoya", "Humanoid" # LEC Stars
        ]
        
        users = []
        for name in names:
            email = f"{name.lower()}@hextech.gg"
            user = User.objects.create_user(username=name, email=email, password=pw)
            users.append(user)
            
        organizer = users[0] 

        # 3. CREATE TOURNAMENTS
        
        # --- A. OPEN TOURNAMENT (Status: OPEN) ---
        self.stdout.write("   - Creating 'Open' Tournament...")
        t_open = Tournament.objects.create(
            name="Winter Split Clash 2026",
            description="Open registration. 5v5 Summoner's Rift.",
            discipline="5v5_summoners_rift",
            organizer=organizer,
            status="open",
            start_time=timezone.now() + timedelta(days=5),
            deadline=timezone.now() + timedelta(days=2),
            max_participants=8,
        )
        self._add_participant(t_open, users[1], "T1 Academy", "Zeus#KR1", 1000)
        self._add_participant(t_open, users[2], "G2 Esports", "Yike#EUW", 950)


        # --- B. ONGOING TOURNAMENT (Status: ONGOING) ---
        self.stdout.write("   - Creating 'Ongoing' Tournament...")
        t_ongoing = Tournament.objects.create(
            name="MSI 2025 Finals",
            description="Mid-Season Invitational finals.",
            discipline="1v1_howling_abyss",
            organizer=organizer,
            status="open", # Temporary, to allow start logic
            start_time=timezone.now() - timedelta(hours=2),
            deadline=timezone.now() - timedelta(hours=4),
            max_participants=8
        )
        
        # Add 8 participants
        for i in range(1, 9):
            self._add_participant(t_ongoing, users[i], f"Team {users[i].username}", f"{users[i].username}#RIOT", 1200 + (i*10))
            
        # Generate Bracket
        try:
            t_ongoing.start_tournament() 
            self.stdout.write("     -> Ongoing bracket generated.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"     -> Failed to start ongoing: {e}"))


        # --- C. FINISHED TOURNAMENT (Status: FINISHED) ---
        self.stdout.write("   - Creating 'Finished' Tournament with Full History...")
        t_finished = Tournament.objects.create(
            name="Worlds 2024",
            description="Legacy tournament with full match history.",
            discipline="5v5_summoners_rift",
            organizer=organizer,
            status="finished",
            start_time=timezone.now() - timedelta(days=365),
            deadline=timezone.now() - timedelta(days=370),
            max_participants=4
        )

        # 1. Add Participants
        p_faker = self._add_participant(t_finished, users[0], "T1", "Faker#GOAT", 3000)
        p_caps  = self._add_participant(t_finished, users[5], "G2", "Caps#EUW", 2800)
        p_deft  = self._add_participant(t_finished, users[13], "KT Rolster", "Deft#LLAMA", 2700)
        p_perkz = self._add_participant(t_finished, users[17], "Heretics", "Perkz#C9", 2600)

        # 2. Create The Final Match (Round 2)
        match_final = Match.objects.create(
            tournament=t_finished,
            round_number=2,      # CHANGED: 'round' -> 'round_number'
            match_number=0,      # ADDED: Required by your model
            player1=p_faker.user,
            player2=p_deft.user,
            winner=p_faker.user
            # REMOVED: score1, score2, status (Not in your model)
        )

        # 3. Create Semifinals (Round 1)
        # Semi A: Faker vs Caps
        Match.objects.create(
            tournament=t_finished,
            round_number=1,      # CHANGED: 'round' -> 'round_number'
            match_number=0,      # ADDED: Match 0 of Round 1
            next_match=match_final,
            player1=p_faker.user,
            player2=p_caps.user,
            winner=p_faker.user
        )

        # Semi B: Deft vs Perkz
        Match.objects.create(
            tournament=t_finished,
            round_number=1,      # CHANGED: 'round' -> 'round_number'
            match_number=1,      # ADDED: Match 1 of Round 1
            next_match=match_final,
            player1=p_deft.user,
            player2=p_perkz.user,
            winner=p_deft.user
        )

        self.stdout.write(self.style.SUCCESS(f"✅ DONE! Database seeded with {len(users)} users and 3 tournaments."))
        self.stdout.write(self.style.SUCCESS(f"ℹ️  Login as: {organizer.email} / {pw}"))
    def _add_participant(self, tournament, user, team_name, ign, mmr):
        """Creates and returns a Participant object"""
        p = Participant.objects.create(
            user=user,
            tournament=tournament,
            team_name=team_name,
            license_number=ign,
            ranking_points=mmr,
            teammates_names="Zeus, Oner, Guma, Keria" if tournament.discipline == '5v5_summoners_rift' else ""
        )
        return p