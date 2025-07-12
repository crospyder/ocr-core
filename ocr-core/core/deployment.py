# core/deployment.py

from sqlalchemy.orm import Session
from core.database.models import Client

# ========== DOHVAT DOMAĆEG OIB-a ==========
def get_owner_oib(db: Session) -> str | None:
    client = db.query(Client).first()
    return client.oib if client else None

# ========== DOHVAT SVIH PODATAKA O KLIJENTU ==========
def get_client_data(db: Session) -> dict | None:
    client = db.query(Client).first()
    if not client:
        return None
    return {
        "naziv_firme": client.naziv_firme,
        "oib": client.oib,
        "db_name": client.db_name,
        "adresa": client.adresa,
        "kontakt_osoba": client.kontakt_osoba,
        "email": client.email,
        "telefon": client.telefon,
        "broj_licenci": client.broj_licenci,
        "licenca_pocetak": str(client.licenca_pocetak) if client.licenca_pocetak else None,
        "licenca_kraj": str(client.licenca_kraj) if client.licenca_kraj else None,
        "status_licence": client.status_licence,
    }

# ========== UPSERT (INSERT/UPDATE) KLIJENTA PREKO DEPLOYMENTA ==========
def upsert_client(db: Session, data: dict) -> Client:
    print("PRIMLJENI PODACI:", data)  # DEBUG – vidiš točno što dolazi iz frontenda
    # Pronađi klijenta po OIB-u (možeš po db_name-u ako ti tako treba)
    client = db.query(Client).filter(Client.oib == data.get("oib")).first()
    if not client:
        client = Client(**data)
        db.add(client)
    else:
        for key, value in data.items():
            setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client
