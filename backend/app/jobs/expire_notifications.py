from app.database import SessionLocal
from app.notification_jobs import expire_obsolete

if __name__ == "__main__":
    with SessionLocal() as db:
        print(f"Expired {expire_obsolete(db)} notification(s).")
