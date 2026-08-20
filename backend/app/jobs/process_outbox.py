from app.database import SessionLocal
from app.notification_jobs import process_outbox


def process(limit: int = 100) -> int:
    with SessionLocal() as db:
        return process_outbox(db, limit=limit)


if __name__ == "__main__":
    print(f"Processed {process()} outbox event(s).")
