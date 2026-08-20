from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine, get_db
from . import models
from .routers import admin, auth, clubs, events, notifications, registrations
from .storage import UPLOAD_DIR

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CampusLoop API",
    description="College event registration and management API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clubs.router)
app.include_router(events.router)
app.include_router(registrations.router)
app.include_router(admin.router)
app.include_router(notifications.router)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "CampusLoop API is running"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        ) from exc
    return {
        "status": "healthy",
        "database": "connected"
    }
