from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from . import models
from .routers import auth, events

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CampusLoop API",
    description="College event registration and management API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)


@app.get("/")
def root():
    return {"message": "CampusLoop API is running"}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }
