from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database.connection import get_db
from core.database.models import User, Client
from pydantic import BaseModel, ConfigDict
from passlib.context import CryptContext

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic modeli za validaciju inputa i outputa
class UserCreate(BaseModel):
    client_id: int
    username: str
    password: str
    email: str | None = None
    role: str = "user"

class UserUpdate(BaseModel):
    username: str | None = None
    password: str | None = None
    email: str | None = None
    role: str | None = None

class ClientCreate(BaseModel):
    name: str
    oib: str
    db_name: str
    licenses: int = 1

# Output model za dobavljače
class SupplierOut(BaseModel):
    id: int
    name: str
    oib: str

    model_config = ConfigDict(from_attributes=True)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    user_exists = db.query(User).filter(User.username == user_data.username).first()
    if user_exists:
        raise HTTPException(status_code=400, detail="Korisničko ime već postoji")

    hashed_password = get_password_hash(user_data.password)
    user = User(
        client_id=user_data.client_id,
        username=user_data.username,
        password_hash=hashed_password,
        email=user_data.email,
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/users/{user_id}")
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    if user_data.username is not None:
        user.username = user_data.username
    if user_data.password is not None:
        user.password_hash = get_password_hash(user_data.password)
    if user_data.email is not None:
        user.email = user_data.email
    if user_data.role is not None:
        user.role = user_data.role

    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    db.delete(user)
    db.commit()
    return

# Opcionalno: Rute za klijente (clients) ako ti treba

@router.get("/")
def get_clients(db: Session = Depends(get_db)):
    return db.query(Client).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientCreate, db: Session = Depends(get_db)):
    client_exists = db.query(Client).filter(Client.db_name == client_data.db_name).first()
    if client_exists:
        raise HTTPException(status_code=400, detail="Client sa tim db_name već postoji")

    client = Client(
        name=client_data.name,
        oib=client_data.oib,
        db_name=client_data.db_name,
        licenses=client_data.licenses,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

# Ruta za dohvat dobavljača (klijenata) — frontend dropdown
@router.get("/suppliers", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Client).order_by(Client.name).all()

