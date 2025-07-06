# chatGPT je peder
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from core.schemas.client_info import ClientInfo
from core.models.client_company import ClientCompany
from core.database.connection import get_db
import json

router = APIRouter()

@router.post("/client/upload")
async def upload_client_info(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".json", ".txt")):
        raise HTTPException(status_code=400, detail="Dozvoljeni formati: .json, .txt")

    contents = await file.read()
    try:
        data = json.loads(contents)
        client_data = ClientInfo(**data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Neispravan JSON: {e}")

    existing = db.query(ClientCompany).filter_by(oib=client_data.oib).first()
    if existing:
        raise HTTPException(status_code=409, detail="Klijent s ovim OIB-om već postoji")

    new_client = ClientCompany(**client_data.dict())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    return {"msg": "Klijent uspješno spremljen", "client_id": new_client.id}

@router.get("/client/info")
def get_client_info(db: Session = Depends(get_db)):
    client = db.query(ClientCompany).first()
    if not client:
        raise HTTPException(status_code=404, detail="Nema podataka o klijentu")
    return {
        "naziv_firme": client.naziv_firme,
        "oib": client.oib,
        "adresa": client.adresa,
        "kontakt_osoba": client.kontakt_osoba,
        "email": client.email,
        "telefon": client.telefon
    }
