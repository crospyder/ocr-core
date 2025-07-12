from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from core.database.connection import get_db
from core.database.models import SoftwareInfo
import json

router = APIRouter()

@router.post("/software/upload")
async def upload_software_info(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Dozvoljen je samo .json format")
    content = await file.read()
    try:
        data = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Neispravan JSON: {e}")

    # Upsert - update zadnji zapis ili insert ako nema
    info = db.query(SoftwareInfo).order_by(SoftwareInfo.id.desc()).first()
    if info:
        for k, v in data.items():
            setattr(info, k, v)
        db.commit()
        db.refresh(info)
        return {"msg": "Verzija softvera ažurirana", "id": info.id}
    else:
        new_info = SoftwareInfo(**data)
        db.add(new_info)
        db.commit()
        db.refresh(new_info)
        return {"msg": "Verzija softvera spremljena", "id": new_info.id}
