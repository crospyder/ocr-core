from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from core.database.connection import SessionMain
from core.database.models import User
from passlib.context import CryptContext
from pydantic import BaseModel
import os

router = APIRouter(prefix="/api/admin")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionMain()
    try:
        yield db
    finally:
        db.close()

# === Pydantic modeli ===

class UserCreate(BaseModel):
    username: str
    role: str
    password: str = "defaultpassword"

class UserUpdate(BaseModel):
    username: str | None = None
    role: str | None = None
    password: str | None = None

# === Rute za korisnike ===

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]

@router.post("/users")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Korisničko ime već postoji")

    hashed_password = pwd_context.hash(user.password)
    new_user = User(
        username=user.username,
        role=user.role,
        password_hash=hashed_password,
        client_id=1  # prilagodi po potrebi
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username, "role": new_user.role}

@router.put("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    if payload.username:
        user.username = payload.username
    if payload.role:
        user.role = payload.role
    if payload.password:
        user.password_hash = pwd_context.hash(payload.password)

    db.commit()
    db.refresh(user)
    return {"message": "Korisnik ažuriran", "user": {"id": user.id, "username": user.username}}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    db.delete(user)
    db.commit()
    return {"message": "Korisnik obrisan"}

# === LOG API: /api/admin/logs/{service} ===

LOG_FILES = {
    "ocr-core-backend": "./logs/backend.log",
    "ocr-core-frontend": "./logs/frontend.log"   # Ako frontend logira u file, inače makni ovu liniju
}

@router.get("/logs/{service}")
def get_logs(
    service: str,
    lines: int = Query(400, ge=1, le=2000)
):
    """
    Dohvati zadnjih X linija iz log file-a za zadani service.
    service = 'ocr-core-backend' ili 'ocr-core-frontend'
    """
    log_path = LOG_FILES.get(service)
    if not log_path or not os.path.isfile(log_path):
        raise HTTPException(status_code=404, detail=f"Log file za servis '{service}' ne postoji.")

    def tail(file, n):
        with open(file, 'rb') as f:
            f.seek(0, os.SEEK_END)
            filesize = f.tell()
            block = 2048
            data = b''
            while n > 0 and filesize > 0:
                jump = min(block, filesize)
                f.seek(filesize - jump)
                chunk = f.read(jump)
                data = chunk + data
                filesize -= jump
                n -= chunk.count(b'\n')
            return b'\n'.join(data.splitlines()[-lines:]).decode('utf-8', errors='replace')

    logs = tail(log_path, lines)
    return {"logs": logs}
