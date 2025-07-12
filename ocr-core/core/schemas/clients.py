from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class ClientCreate(BaseModel):
    naziv_firme: str
    oib: str
    db_name: str
    broj_licenci: int
    adresa: Optional[str] = None
    kontakt_osoba: Optional[str] = None
    email: Optional[EmailStr] = None
    telefon: Optional[str] = None
    licenca_pocetak: Optional[date] = None
    licenca_kraj: Optional[date] = None
    status_licence: Optional[str] = "active"
