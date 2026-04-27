import smtplib
from email.message import EmailMessage

from .config import settings


def is_mail_configured() -> bool:
  return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(to_email: str, subject: str, body: str):
  if not is_mail_configured():
    print(f"[MAIL NOT CONFIGURED] To: {to_email} | Subject: {subject}\n{body}")
    return

  message = EmailMessage()
  message["From"] = settings.SMTP_FROM
  message["To"] = to_email
  message["Subject"] = subject
  message.set_content(body)

  with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
    server.starttls()
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    server.send_message(message)


def send_registration_emails(new_user, recipients):
  send_email(
    new_user.email,
    "Welcome to Lumina LMS",
    f"Hi {new_user.name},\n\nYour LMS account has been created successfully.\nWelcome to Lumina LMS family!\n\nRegards,\nLumina LMS",
  )

  for recipient in recipients:
    send_email(
      recipient.email,
      "New LMS signup",
      f"Hi {recipient.name},\n\nA new {new_user.role} joined Lumina LMS.\n\nName: {new_user.name}\nEmail: {new_user.email}",
    )


def send_password_reset_otp(email: str, otp: str):
  send_email(
    email,
    "Lumina LMS password reset OTP",
    f"Your password reset OTP is {otp}.\n\nThis OTP expires in 10 minutes. If you did not request this, ignore this email.",
  )
