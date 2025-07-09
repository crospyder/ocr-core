from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database.connection import SessionMain
from core.database.models import User
from passlib.context import CryptContext
from pydantic import BaseModel

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

# === Rute ===

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
