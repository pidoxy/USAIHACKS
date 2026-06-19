"""
Google OAuth 2.0 helpers — authorization URL generation, token exchange,
credential refresh, and Calendar API service construction.
"""

import json
from datetime import datetime, timedelta

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from config import settings

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

CLIENT_CONFIG = {
    "web": {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}


def build_flow(state: str | None = None) -> Flow:
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        state=state,
    )
    return flow


def get_authorization_url() -> tuple[str, str]:
    """Returns (auth_url, state)."""
    flow = build_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url, state


def exchange_code(code: str, state: str) -> dict:
    """Exchange OAuth code for token dict {access_token, refresh_token, expiry, ...}."""
    flow = build_flow(state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials
    return _creds_to_dict(creds)


def build_credentials(access_token: str, refresh_token: str, token_expiry: str) -> Credentials:
    expiry = None
    if token_expiry:
        try:
            expiry = datetime.fromisoformat(token_expiry)
        except ValueError:
            pass
    return Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
        expiry=expiry,
    )


def build_calendar_service(access_token: str, refresh_token: str, token_expiry: str):
    creds = build_credentials(access_token, refresh_token, token_expiry)
    return build("calendar", "v3", credentials=creds)


def _creds_to_dict(creds: Credentials) -> dict:
    return {
        "access_token": creds.token or "",
        "refresh_token": creds.refresh_token or "",
        "token_expiry": creds.expiry.isoformat() if creds.expiry else "",
        "scopes": list(creds.scopes or []),
    }
