from django.core.management.base import BaseCommand
from django.utils import timezone
from tournaments.models import Tournament

class Command(BaseCommand):
    help = 'Auto-starts tournaments whose deadline has passed.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        # Find Open tournaments where Deadline < Now
        tournaments = Tournament.objects.filter(status='open', deadline__lte=now)

        self.stdout.write(f"Checking {len(tournaments)} tournaments due for start...")

        for t in tournaments:
            try:
                self.stdout.write(f"Attempting to start: {t.name}...")
                t.start_tournament()
                self.stdout.write(self.style.SUCCESS(f"Successfully started: {t.name}"))
            except ValueError as e:
                # If start fails (e.g. < 2 players), we might want to cancel it
                self.stdout.write(self.style.WARNING(f"Failed to start {t.name}: {e}"))
                if "least 2 teams" in str(e):
                     t.status = 'cancelled'
                     t.save()
                     self.stdout.write(self.style.ERROR(f"Cancelled {t.name} due to lack of players."))