from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi import Body
from core.database.connection import get_db
from core.database.models import Client
from core.deployment import upsert_client

router = APIRouter()

@router.get("/info")
def get_client_info(db: Session = Depends(get_db)):
    client = db.query(Client).first()
    if not client:
        return {
            "needs_setup": True,
            "message": (
                "Sustav nije konfiguriran. Uploadajte JSON datoteku s podacima o klijentu u sljedećem formatu:\n\n"
                '{\n'
                '  "naziv_firme": "",\n'
                '  "oib": "",\n'
                '  "adresa": "",\n'
                '  "kontakt_osoba": "",\n'
                '  "email": "",\n'
                '  "telefon": "",\n'
                '  "broj_licenci": ""\n'
                '}'
            )
        }
    return {
        "needs_setup": False,
        "naziv_firme": client.naziv_firme,
        "oib": client.oib,
        "adresa": client.adresa,
        "kontakt_osoba": client.kontakt_osoba,
        "email": client.email,
        "telefon": client.telefon,
        "broj_licenci": client.broj_licenci,
    }

@router.post("/info")
def create_client(data: dict = Body(...), db: Session = Depends(get_db)):
    client = upsert_client(db, data)
    return client

@router.put("/info")
def update_client(data: dict = Body(...), db: Session = Depends(get_db)):
    client = upsert_client(db, data)
    return client
