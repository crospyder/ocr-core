# core/deployment.py
from sqlalchemy.orm import Session
from core.models.client_company import ClientCompany

def get_owner_oib(db: Session) -> str | None:
    client = db.query(ClientCompany).first()
    return client.oib if client else None

def get_client_data(db: Session) -> dict | None:
    client = db.query(ClientCompany).first()
    if not client:
        return None
    return {
        "naziv_firme": client.naziv_firme,
        "oib": client.oib,
        "adresa": client.adresa,
        "kontakt_osoba": client.kontakt_osoba,
        "email": client.email,
        "telefon": client.telefon,
    }
