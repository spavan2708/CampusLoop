from app.database import SessionLocal
from app.notification_jobs import generate_reminders

if __name__ == "__main__":
    with SessionLocal() as db:
        print(f"Created {generate_reminders(db)} notification(s).")
