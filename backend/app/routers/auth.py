from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import CurrentUser
from ..models import User, UserRole
from ..schemas import PasswordChangeRequest, SignupRequest, TokenResponse, UserResponse
from ..security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["authentication"])


def normalized_email(email: str) -> str:
    return email.strip().lower()


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(payload: SignupRequest, db: Annotated[Session, Depends(get_db)]):
    email = normalized_email(str(payload.email))
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=UserRole.STUDENT,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    email = normalized_email(form_data.username)
    user = db.query(User).filter(User.email == email).first()
    if (
        user is None
        or not user.is_active
        or not verify_password(form_data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(str(user.id)))


def role_login(role: UserRole, form_data, db):
    email = normalized_email(form_data.username)
    user = db.query(User).filter(User.email == email).first()
    if user is None or user.role != role or not user.is_active or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return TokenResponse(access_token=create_access_token(str(user.id)))


@router.post("/student/login", response_model=TokenResponse)
def student_login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    return role_login(UserRole.STUDENT, form_data, db)


@router.post("/club/login", response_model=TokenResponse)
def club_login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    return role_login(UserRole.CLUB_ADMIN, form_data, db)


@router.post("/admin/login", response_model=TokenResponse)
def admin_login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Annotated[Session, Depends(get_db)]):
    return role_login(UserRole.CENTRAL_ADMIN, form_data, db)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: CurrentUser):
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: PasswordChangeRequest, current_user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
