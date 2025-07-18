from fastapi import APIRouter
from sqlalchemy.orm import Session
from core.database.connection import SessionMain
from core.database.models import Document
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/validate-classify")
async def validate_classify():
    """
    Endpoint koji će proći kroz OCR dokumente i klasificirati ih.
    Ovo je primjer, stavi svoju stvarnu logiku ovdje.
    """
    db: Session = SessionMain()
    try:
        documents = db.query(Document).all()
        count_validated = 0

        for doc in documents:
            text = doc.ocrresult.lower() if doc.ocrresult else ""

            if "izvod" in text:
                doc.document_type = "IZVOD"
            elif "ugovor" in text:
                doc.document_type = "UGOVOR"
            elif "ira" in text:
                doc.document_type = "IRA"
            elif "ura" in text:
                doc.document_type = "URA"
            else:
                doc.document_type = "OSTALO"

            count_validated += 1

        db.commit()
        return {"message": f"Validacija i klasifikacija završena. Ukupno obrađeno: {count_validated} dokumenata."}
    except Exception as e:
        logger.error(f"Greška u validaciji i klasifikaciji: {e}")
        return {"message": f"Greška: {e}"}
    finally:
        db.close()
