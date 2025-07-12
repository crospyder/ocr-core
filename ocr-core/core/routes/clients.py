from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database.connection import get_db
from core.database.models import Client
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

router = APIRouter(
    prefix="/client",
    tags=["client"]
)

class ClientBase(BaseModel):
    naziv_firme: str
    oib: str
    db_name: str
    broj_licenci: Optional[int] = 1
    adresa: Optional[str] = None
    kontakt_osoba: Optional[str] = None
    email: Optional[EmailStr] = None
    telefon: Optional[str] = None
    licenca_pocetak: Optional[date] = None
    licenca_kraj: Optional[date] = None
    status_licence: Optional[str] = "active"

class ClientUpdate(BaseModel):
    naziv_firme: Optional[str] = None
    oib: Optional[str] = None
    db_name: Optional[str] = None
    broj_licenci: Optional[int] = None
    adresa: Optional[str] = None
    kontakt_osoba: Optional[str] = None
    email: Optional[EmailStr] = None
    telefon: Optional[str] = None
    licenca_pocetak: Optional[date] = None
    licenca_kraj: Optional[date] = None
    status_licence: Optional[str] = None

class ClientOut(ClientBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        orm_mode = True

@router.get("/info", response_model=ClientOut | dict)
def get_client_info(db: Session = Depends(get_db)):
    client = db.query(Client).first()
    if not client:
        return {
            "needs_setup": True,
            "message": "Sustav nije konfiguriran. Molimo unesite podatke o klijentu."
        }
    return client

@router.post("/info", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(client_data: ClientBase, db: Session = Depends(get_db)):
    existing = db.query(Client).first()
    if existing:
        raise HTTPException(status_code=400, detail="Klijent je već konfiguriran")
    client = Client(**client_data.dict())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.put("/info", response_model=ClientOut)
def update_client(client_data: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).first()
    if not client:
        raise HTTPException(status_code=404, detail="Klijent nije pronađen")
    for key, value in client_data.dict(exclude_unset=True).items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client
