"""
/api/auth — Google OAuth 2.0 flow

GET  /api/auth/google          → returns {auth_url, state} for the frontend to redirect to
GET  /api/auth/google/callback → handles Google redirect, upserts User, returns {user_id, email}
GET  /api/auth/me              → returns current user profile (pass ?user_id=N)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from sqlalchemy.orm import Session

from auth.google_oauth import get_authorization_url, exchange_code, build_credentials
from database import get_db
from models import User
from config import settings

router = APIRouter()


@router.get("/google")
def google_login():
    """Step 1: Generate the Google OAuth authorization URL."""
    auth_url, state = get_authorization_url()
    return {"auth_url": auth_url, "state": state}


@router.get("/google/callback")
def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Step 2: Exchange code for tokens, upsert user, redirect to frontend."""
    try:
        token_data = exchange_code(code=code, state=state)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"OAuth exchange failed: {exc}")

    # Fetch user info from Google
    creds = build_credentials(
        access_token=token_data["access_token"],
        refresh_token=token_data["refresh_token"],
        token_expiry=token_data["token_expiry"],
    )
    try:
        user_info_svc = build("oauth2", "v2", credentials=creds)
        info = user_info_svc.userinfo().get().execute()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch user info: {exc}")

    google_id = info.get("id", "")
    email = info.get("email", "")
    name = info.get("name", "")

    user = db.query(User).filter(User.google_id == google_id).first()
    if user is None:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_expiry=token_data["token_expiry"],
        )
        db.add(user)
    else:
        user.access_token = token_data["access_token"]
        user.refresh_token = token_data["refresh_token"]
        user.token_expiry = token_data["token_expiry"]
        user.name = name

    db.commit()
    db.refresh(user)

    # Redirect to frontend with user_id so it can be stored in localStorage
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard?user_id={user.id}&email={email}"
    )


@router.get("/me")
def get_me(user_id: int = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "eta_0": user.eta_0,
        "circadian_type": user.circadian_type,
    }


@router.patch("/me/circadian")
def update_circadian(
    user_id: int = Query(...),
    circadian_type: str = Query(..., pattern="^(morning|evening)$"),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.circadian_type = circadian_type
    db.commit()
    return {"user_id": user.id, "circadian_type": user.circadian_type}
