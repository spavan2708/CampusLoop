from app.database import SessionLocal
from app.notification_jobs import deliver_due

if __name__ == "__main__":
    with SessionLocal() as db:
        print(f"Delivered {deliver_due(db)} scheduled notification(s).")
