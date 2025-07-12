from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database.connection import get_db
from core.database.models import Client

router = APIRouter()

@router.get("/info")
def get_client_info(db: Session = Depends(get_db)):
    client = db.query(Client).first()
    if not client:
        # Ako nema klijenta, signaliziraj potrebu za setupom
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

    # Ako postoji klijent, vrati njegove podatke
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
