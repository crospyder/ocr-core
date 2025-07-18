import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
import imaplib
from core.database.connection import get_db
from cryptography.fernet import Fernet, InvalidToken
from core.database.models import MailAccount

router = APIRouter(tags=["mail_accounts"])

FERNET_KEY = os.getenv("FERNET_KEY")
if not FERNET_KEY:
    raise RuntimeError("FERNET_KEY nije definiran u .env")

fernet = Fernet(FERNET_KEY.encode() if isinstance(FERNET_KEY, str) else FERNET_KEY)

class MailAccountBase(BaseModel):
    name: str
    email: EmailStr
    provider: str | None = None
    imap_server: str
    imap_port: int
    use_ssl: bool = True
    username: str
    password: str  # plaintext password input (input-only)
    active: bool = True

    @validator("imap_port")
    def valid_port(cls, v):
        if v <= 0 or v > 65535:
            raise ValueError("Neispravan port")
        return v

class MailAccountCreate(MailAccountBase):
    pass

class MailAccountResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    provider: str | None = None
    imap_server: str
    imap_port: int
    use_ssl: bool
    username: str
    active: bool

    class Config:
        from_attributes = True

def encrypt_password(password: str) -> str:
    return fernet.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    try:
        return fernet.decrypt(encrypted_password.encode()).decode()
    except InvalidToken:
        raise HTTPException(status_code=500, detail="Lozinka ne može biti dešifrirana")

@router.get("/", response_model=list[MailAccountResponse])
async def get_mail_accounts(db: Session = Depends(get_db)):
    accounts = db.query(MailAccount).all()
    results = []
    for acc in accounts:
        # Kreiraj output model bez passworda
        acc_data = MailAccountResponse.from_orm(acc)
        results.append(acc_data)
    return results

@router.post("/test")
async def test_mail_settings(data: MailAccountBase):
    try:
        mail = imaplib.IMAP4_SSL(data.imap_server, data.imap_port)
        mail.login(data.username, data.password)
        mail.logout()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"IMAP test nije uspio: {str(e)}")
    return {"success": True, "message": "IMAP povezivanje uspješno!"}

@router.post("/")
async def create_or_update_mail_account(
    data: MailAccountCreate,
    db: Session = Depends(get_db)
):
    account = db.query(MailAccount).filter(MailAccount.email == data.email).first()
    encrypted_password = encrypt_password(data.password)
    if account:
        account.name = data.name
        account.provider = data.provider
        account.imap_server = data.imap_server
        account.imap_port = data.imap_port
        account.use_ssl = data.use_ssl
        account.username = data.username
        account.password_encrypted = encrypted_password
        account.active = data.active
    else:
        account = MailAccount(
            name=data.name,
            email=data.email,
            provider=data.provider,
            imap_server=data.imap_server,
            imap_port=data.imap_port,
            use_ssl=data.use_ssl,
            username=data.username,
            password_encrypted=encrypted_password,
            active=data.active,
        )
        db.add(account)
    db.commit()
    db.refresh(account)

    acc_data = MailAccountResponse.from_orm(account)
    return acc_data
