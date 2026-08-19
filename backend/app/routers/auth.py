from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import CurrentUser
from ..models import User
from ..schemas import SignupRequest, TokenResponse, UserResponse
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
        role=payload.role,
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


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: CurrentUser):
    return current_user
