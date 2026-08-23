import re
from fastapi import APIRouter, File, HTTPException, UploadFile
from ..dependencies import CentralAdminUser, ClubAdminUser, DatabaseSession
from ..models import ApprovalStatus, Club, ClubAdminMembership, Event, EventStatus
from ..schemas import ClubResponse, ClubUpdateRequest, EventList, ModerationRequest, utc_now_naive
from ..storage import storage

router = APIRouter(prefix="/clubs", tags=["clubs"])


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


@router.get("", response_model=list[ClubResponse])
def list_clubs(db: DatabaseSession):
    return db.query(Club).filter(Club.approval_status == ApprovalStatus.APPROVED, Club.is_active.is_(True)).order_by(Club.name).all()


def current_club(user: ClubAdminUser, db: DatabaseSession) -> Club:
    membership = db.query(ClubAdminMembership).filter_by(user_id=user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Club membership not found")
    return membership.club


@router.get("/me/profile", response_model=ClubResponse)
def get_my_club(user: ClubAdminUser, db: DatabaseSession):
    return current_club(user, db)


@router.patch("/me/profile", response_model=ClubResponse)
def update_my_club(payload: ClubUpdateRequest, user: ClubAdminUser, db: DatabaseSession):
    club = current_club(user, db)
    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(club, field_name, value)
    db.commit()
    db.refresh(club)
    return club


@router.post("/me/logo", response_model=ClubResponse)
async def upload_club_logo(user: ClubAdminUser, db: DatabaseSession, image: UploadFile = File(...)):
    club = current_club(user, db)
    try:
        club.logo_url = storage.save_image(await image.read(), image.content_type or "", entity_type="club", entity_id=club.id, asset_type="logo")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.commit(); db.refresh(club); return club


@router.post("/me/banner", response_model=ClubResponse)
async def upload_club_banner(user: ClubAdminUser, db: DatabaseSession, image: UploadFile = File(...)):
    club = current_club(user, db)
    try:
        club.banner_url = storage.save_image(await image.read(), image.content_type or "", entity_type="club", entity_id=club.id, asset_type="banner")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.commit(); db.refresh(club); return club


@router.get("/{slug}", response_model=ClubResponse)
def get_club(slug: str, db: DatabaseSession):
    club = db.query(Club).filter(Club.slug == slug, Club.approval_status == ApprovalStatus.APPROVED, Club.is_active.is_(True)).first()
    if not club: raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.get("/{slug}/events", response_model=EventList)
def get_club_events(slug: str, db: DatabaseSession):
    club = db.query(Club).filter(Club.slug == slug, Club.approval_status == ApprovalStatus.APPROVED, Club.is_active.is_(True)).first()
    if not club: raise HTTPException(status_code=404, detail="Club not found")
    items = db.query(Event).filter(Event.club_id == club.id, Event.status == EventStatus.PUBLISHED, Event.event_date >= utc_now_naive()).order_by(Event.event_date).all()
    return EventList(items=items, total=len(items))


@router.post("/{club_id}/approve", response_model=ClubResponse)
def approve_club(club_id: int, admin: CentralAdminUser, db: DatabaseSession):
    club = db.get(Club, club_id)
    if not club: raise HTTPException(status_code=404, detail="Club not found")
    club.approval_status = ApprovalStatus.APPROVED; club.rejection_reason = None
    for membership in club.memberships: membership.user.is_active = True
    db.commit(); db.refresh(club); return club


@router.post("/{club_id}/reject", response_model=ClubResponse)
def reject_club(club_id: int, payload: ModerationRequest, admin: CentralAdminUser, db: DatabaseSession):
    if not payload.reason: raise HTTPException(status_code=422, detail="Rejection reason is required")
    club = db.get(Club, club_id)
    if not club: raise HTTPException(status_code=404, detail="Club not found")
    club.approval_status = ApprovalStatus.REJECTED; club.rejection_reason = payload.reason
    db.commit(); db.refresh(club); return club
