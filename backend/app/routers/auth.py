from datetime import datetime, timedelta, timezone
from secrets import randbelow, token_urlsafe
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..dependencies import get_current_user
from ..mailer import send_password_reset_otp, send_registration_emails
from ..models import PasswordResetOTP, User
from ..schemas import (
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  ResetPasswordRequest,
  TokenResponse,
  UserCreate,
  UserOut,
)
from ..security import create_access_token, create_refresh_token, hash_password, verify_hash, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])

OAUTH_PROVIDERS = {
  "google": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
    "scope": "openid email profile",
    "client_id": lambda: settings.GOOGLE_CLIENT_ID,
    "client_secret": lambda: settings.GOOGLE_CLIENT_SECRET,
    "token_method": "post",
    "profile_mode": "openid",
  },
  "facebook": {
    "auth_url": "https://www.facebook.com/v22.0/dialog/oauth",
    "token_url": "https://graph.facebook.com/v22.0/oauth/access_token",
    "userinfo_url": "https://graph.facebook.com/v22.0/me",
    "scope": "email,public_profile",
    "client_id": lambda: settings.FACEBOOK_CLIENT_ID,
    "client_secret": lambda: settings.FACEBOOK_CLIENT_SECRET,
    "token_method": "get",
    "profile_mode": "graph",
  },
}


def token_response(user: User) -> TokenResponse:
  return TokenResponse(
    access_token=create_access_token(str(user.id), user.role),
    refresh_token=create_refresh_token(str(user.id), user.role),
    user=user,
  )


def redirect_with_tokens(user: User):
  tokens = token_response(user)
  params = urlencode({
    "access_token": tokens.access_token,
    "refresh_token": tokens.refresh_token,
    "id": user.id,
    "name": user.name,
    "email": user.email,
    "role": user.role,
    "avatar": user.avatar or "",
    "oauth_provider": user.oauth_provider or "",
  })
  return RedirectResponse(f"{settings.FRONTEND_URL}/auth?{params}")


def oauth_state(provider: str) -> str:
  payload = {
    "provider": provider,
    "nonce": token_urlsafe(16),
    "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
  }
  return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def validate_oauth_state(state: str, provider: str):
  try:
    payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
  except JWTError as exc:
    raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc

  if payload.get("provider") != provider:
    raise HTTPException(status_code=400, detail="OAuth provider mismatch")


def redirect_uri(provider: str) -> str:
  return f"{settings.BACKEND_URL}/api/auth/oauth/{provider}/callback"


def get_or_create_oauth_user(db: Session, email: str, name: str, provider: str) -> User:
  user = db.query(User).filter(User.email == email).first()
  if user:
    if not user.oauth_provider:
      user.oauth_provider = provider
      db.commit()
      db.refresh(user)
    return user

  user = User(
    name=name or email.split("@")[0],
    email=email,
    password=hash_password(token_urlsafe(24)),
    role="student",
    oauth_provider=provider,
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def create_reset_otp(db: Session, email: str) -> str:
  otp = f"{randbelow(900000) + 100000}"
  db.add(
    PasswordResetOTP(
      email=email,
      otp_hash=hash_password(otp),
      expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
  )
  db.commit()
  return otp


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
  if db.query(User).filter(User.email == payload.email).first():
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

  user = User(
    name=payload.name,
    email=payload.email,
    password=hash_password(payload.password),
    role="student",
  )
  db.add(user)
  db.commit()
  db.refresh(user)

  recipients = db.query(User).filter(User.role.in_(["admin", "mentor"])).all()
  background_tasks.add_task(send_registration_emails, user, recipients)
  return token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == payload.email).first()
  if user and user.oauth_provider:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"This account uses {user.oauth_provider.title()} sign-in. Please continue with {user.oauth_provider.title()}.",
    )
  if not user or not verify_password(user.email, payload.password, user.password):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
  return token_response(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
  return current_user


@router.get("/oauth/{provider}")
def oauth_login(provider: str):
  provider_config = OAUTH_PROVIDERS.get(provider)
  if not provider_config:
    raise HTTPException(status_code=404, detail="OAuth provider not supported")

  client_id = provider_config["client_id"]()
  if not client_id or not provider_config["client_secret"]():
    raise HTTPException(status_code=503, detail=f"{provider.title()} OAuth is not configured")

  params = {
    "client_id": client_id,
    "redirect_uri": redirect_uri(provider),
    "response_type": "code",
    "scope": provider_config["scope"],
    "state": oauth_state(provider),
  }
  return RedirectResponse(f"{provider_config['auth_url']}?{urlencode(params)}")


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
  provider: str,
  code: str = Query(...),
  state: str = Query(...),
  db: Session = Depends(get_db),
):
  provider_config = OAUTH_PROVIDERS.get(provider)
  if not provider_config:
    raise HTTPException(status_code=404, detail="OAuth provider not supported")

  validate_oauth_state(state, provider)

  async with httpx.AsyncClient(timeout=15) as client:
    token_payload = {
      "grant_type": "authorization_code",
      "code": code,
      "redirect_uri": redirect_uri(provider),
      "client_id": provider_config["client_id"](),
      "client_secret": provider_config["client_secret"](),
    }
    if provider_config.get("token_method") == "get":
      token_response_data = await client.get(
        provider_config["token_url"],
        params=token_payload,
        headers={"Accept": "application/json"},
      )
    else:
      token_response_data = await client.post(
        provider_config["token_url"],
        data=token_payload,
        headers={"Accept": "application/json"},
      )
    if token_response_data.status_code >= 400:
      raise HTTPException(status_code=400, detail="OAuth token exchange failed")

    access_token = token_response_data.json().get("access_token")
    if provider_config.get("profile_mode") == "graph":
      userinfo_response = await client.get(
        provider_config["userinfo_url"],
        params={
          "fields": "id,name,email",
          "access_token": access_token,
        },
      )
    else:
      userinfo_response = await client.get(
        provider_config["userinfo_url"],
        headers={"Authorization": f"Bearer {access_token}"},
      )
    if userinfo_response.status_code >= 400:
      raise HTTPException(status_code=400, detail="OAuth profile fetch failed")

  profile = userinfo_response.json()
  email = profile.get("email")
  name = profile.get("name") or f"{profile.get('given_name', '')} {profile.get('family_name', '')}".strip()
  if not email:
    raise HTTPException(status_code=400, detail="OAuth provider did not return an email")

  user = get_or_create_oauth_user(db, email, name, provider)
  return redirect_with_tokens(user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == payload.email).first()
  if user and user.oauth_provider:
    return {"message": f"This account uses {user.oauth_provider.title()} sign-in. Please continue with {user.oauth_provider.title()} instead of resetting a password."}
  if user:
    otp = create_reset_otp(db, payload.email)
    background_tasks.add_task(send_password_reset_otp, payload.email, otp)
  return {"message": "If the email exists, an OTP has been sent."}


@router.post("/resend-otp", response_model=MessageResponse)
def resend_otp(payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == payload.email).first()
  if user and user.oauth_provider:
    return {"message": f"This account uses {user.oauth_provider.title()} sign-in. Please continue with {user.oauth_provider.title()} instead of requesting an OTP."}
  if user:
    otp = create_reset_otp(db, payload.email)
    background_tasks.add_task(send_password_reset_otp, payload.email, otp)
  return {"message": "If the email exists, a new OTP has been sent."}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
  user = db.query(User).filter(User.email == payload.email).first()
  if not user:
    raise HTTPException(status_code=400, detail="Invalid OTP or email")
  if user.oauth_provider:
    raise HTTPException(
      status_code=400,
      detail=f"This account uses {user.oauth_provider.title()} sign-in. Password reset is not available for this account.",
    )

  reset_record = (
    db.query(PasswordResetOTP)
    .filter(PasswordResetOTP.email == payload.email, PasswordResetOTP.used.is_(False))
    .order_by(PasswordResetOTP.created_at.desc())
    .first()
  )
  if not reset_record or reset_record.expires_at < datetime.utcnow():
    raise HTTPException(status_code=400, detail="OTP expired or invalid")

  if not verify_hash(payload.otp, reset_record.otp_hash):
    raise HTTPException(status_code=400, detail="OTP expired or invalid")

  user.password = hash_password(payload.new_password)
  reset_record.used = True
  db.commit()
  return {"message": "Password reset successfully. You can now sign in."}
