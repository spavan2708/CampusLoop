from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, UserRole
from .security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
DatabaseSession = Annotated[Session, Depends(get_db)]


def authentication_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DatabaseSession,
) -> User:
    try:
        token_data = decode_access_token(token)
        user_id = int(token_data.sub)
    except (ValueError, TypeError):
        raise authentication_error()

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise authentication_error()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_student(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return current_user


def require_club_admin(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.CLUB_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Club administrator access required",
        )
    return current_user


StudentUser = Annotated[User, Depends(require_student)]
ClubAdminUser = Annotated[User, Depends(require_club_admin)]
require_organizer = require_club_admin
OrganizerUser = ClubAdminUser


def require_central_admin(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.CENTRAL_ADMIN:
        raise HTTPException(status_code=403, detail="Central administrator access required")
    return current_user


CentralAdminUser = Annotated[User, Depends(require_central_admin)]
