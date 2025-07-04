from fastapi import APIRouter, UploadFile, File, Query
from typing import List
from modules.ocr_processing.workers.engine import perform_ocr
from core.database.connection import SessionMain
from core.database.models import Document
from core.parsers.supplier_extractor import extract_supplier_info

import os
router = APIRouter()

@router.get("/documents")
def get_documents(skip: int = Query(0), limit: int = Query(10)):
    db = SessionMain()
    documents = db.query(Document).offset(skip).limit(limit).all()
    db.close()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "ocrresult": doc.ocrresult[:300] + "..." if doc.ocrresult and len(doc.ocrresult) > 300 else doc.ocrresult
        }
        for doc in documents
    ]

@router.post("/documents")
async def upload_documents(files: List[UploadFile] = File(...)):
    results = []
    db = SessionMain()

    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads", "batch")
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
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

        text = perform_ocr(file_path)
        supplier_info = extract_supplier_info(text)
        if not supplier_info.get("oib"):
            supplier_info["alert"] = "❌ OIB nije pronađen – potrebna ručna validacija dokumenta."

        doc = Document(filename=file.filename, ocrresult=text)
        db.add(doc)
        db.commit()
        db.refresh(doc)  # da dohvatimo ID nakon commita

        results.append({
            "id": doc.id,
            "filename": file.filename,
            "status": "OK",
            "ocrresult_preview": text[:300] + "..." if text and len(text) > 300 else text,
            "ocrresult_full": text,
            "supplier": supplier_info
        })

    db.close()
    return {"processed": results}
