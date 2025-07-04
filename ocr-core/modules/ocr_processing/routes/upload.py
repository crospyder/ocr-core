import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Query
from typing import List
from modules.ocr_processing.workers.engine import perform_ocr_and_get_supplier_info
from core.database.connection import SessionMain
from core.database.models import Document, Client
from core.parsers.supplier_extractor import extract_supplier_info

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/documents")
async def upload_documents(files: List[UploadFile] = File(...)):
    ocr_processed_at = datetime.utcnow()
    results = []
    db = SessionMain()

    for file in files:
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "FAILED",
                "error": str(e)
            })
            continue

        # Perform OCR + get supplier info from Sudreg API
        ocr_result = perform_ocr_and_get_supplier_info(file_path)
        text = ocr_result.get("ocr_text", "")
        supplier_oib = ocr_result.get("supplier_oib")
        supplier_info = ocr_result.get("supplier_info") or {}

        # fallback na stari extractor ako treba (možeš i ukloniti ako želiš)
        fallback_supplier_info = extract_supplier_info(text)

        # Pokušaj pronaći dobavljača u bazi prema OIB-u iz Sudrega
        supplier_obj = None
        if supplier_oib:
            supplier_obj = db.query(Client).filter(Client.oib == supplier_oib).first()
        elif fallback_supplier_info.get("oib"):
            supplier_obj = db.query(Client).filter(Client.oib == fallback_supplier_info["oib"]).first()

        # Postavi status validacije i alert poruku ako treba
        validation_status = "valid" if supplier_obj else "not_found"
        validation_alert = None

        if not supplier_oib and not fallback_supplier_info.get("oib"):
            validation_status = "missing_oib"
            validation_alert = "❌ OIB nije pronađen – potrebna ručna validacija dokumenta."

        # Kreiraj Document zapis s OCR i dobivenim podacima
        doc = Document(
            filename=unique_name,
            ocrresult=text,
            supplier_id=supplier_obj.id if supplier_obj else None,
            supplier_name_ocr=supplier_info.get("naziv_firme") or fallback_supplier_info.get("naziv_firme"),
            supplier_oib_ocr=supplier_oib or fallback_supplier_info.get("oib"),
            created_at=ocr_processed_at
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        results.append({
            "id": doc.id,
            "filename": unique_name,
            "original_filename": file.filename,
            "status": "OK",
            "ocrresult_preview": text[:300] + "..." if text and len(text) > 300 else text,
            "ocrresult_full": text,
            "supplier": supplier_info or fallback_supplier_info,
            "validation_status": validation_status,
            "validation_alert": validation_alert,
        })

    db.close()
    return {"processed": results}


@router.get("/documents")
def get_documents(skip: int = Query(0), limit: int = Query(100)):
    db = SessionMain()
    try:
        documents = (
            db.query(Document)
            .order_by(Document.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        result = []
        for doc in documents:
            result.append({
                "id": doc.id,
                "filename": doc.filename,
                "date": doc.created_at.isoformat() if doc.created_at else None,
                "supplier": {
                    "naziv_firme": doc.supplier.name if doc.supplier else None,
                    "oib": doc.supplier.oib if doc.supplier else None,
                } if doc.supplier else None,
                "amount": doc.amount,
                "status": "-",  # ako trebaš dodaj logiku za status
                # Dodaj ako želiš prikazati validaciju i alert iz baze ili postavi null (možeš proširiti model)
                # Ovdje ne koristimo polja iz baze za validaciju jer su vezana uz upload rezultat
                # ako želiš, možeš proširiti model za to
                "validation_status": None,
                "validation_alert": None,
            })
        return result
    finally:
        db.close()
