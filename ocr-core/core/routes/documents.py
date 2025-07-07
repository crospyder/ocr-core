from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import List
from core.database.connection import get_db
from core.database.models import Document
from core.schemas.documents import DocumentOut
import shutil
import os

router = APIRouter()

@router.get("/", response_model=List[DocumentOut])
def list_documents(
    document_type: str | None = Query(None, description="Vrsta dokumenta (URA, IRA, IZVOD, UGOVOR, ...)"),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    documents = query.all()
    result = []
    for doc in documents:
        naziv = getattr(doc, "supplier_name_ocr", None) or (doc.supplier.name if doc.supplier else None)
        oib = getattr(doc, "supplier_oib", None) or (doc.supplier.oib if doc.supplier else None)

        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "ocrresult": doc.ocrresult,
            "date": doc.date,
            "amount": doc.amount,
            "supplier_id": doc.supplier_id,
            "supplier_name_ocr": naziv,
            "supplier_oib": oib,
            "annotation": doc.annotation.annotations if doc.annotation else [],
            "invoice_date": doc.invoice_date.isoformat() if doc.invoice_date else None,
            "due_date": doc.due_date.isoformat() if doc.due_date else None,
            "document_type": doc.document_type,
        })

    return result

@router.get("/stats-info")
def documents_stats(db: Session = Depends(get_db)):
    total_docs = db.query(Document).count()
    processed_docs = db.query(Document).filter(Document.ocrresult != None).count()

    # Ukupna veličina PDF datoteka u MB
    UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads"))
    total_size_bytes = 0
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                total_size_bytes += os.path.getsize(fpath)
    total_size_mb = total_size_bytes / (1024 * 1024)

    # Preostali slobodan prostor na disku u MB (na partciji gdje je UPLOAD_DIR)
    usage = shutil.disk_usage(UPLOAD_DIR)
    free_mb = usage.free / (1024 * 1024)

    return {
        "total_documents": total_docs,
        "processed_documents": processed_docs,
        "total_pdf_size_mb": round(total_size_mb, 2),
        "free_space_mb": round(free_mb, 2),
    }

@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    naziv = getattr(doc, "supplier_name_ocr", None) or (doc.supplier.name if doc.supplier else None)
    oib = getattr(doc, "supplier_oib", None) or (doc.supplier.oib if doc.supplier else None)

    # Dohvat skraćenog naziva tvrtke iz sudreg_response ako postoji
    skraceni_naziv = None
    if doc.sudreg_response:
        try:
            import json
            sudreg_json = json.loads(doc.sudreg_response)
            skracene_tvrtke = sudreg_json.get("skracene_tvrtke")
            if skracene_tvrtke and isinstance(skracene_tvrtke, list) and len(skracene_tvrtke) > 0:
                skraceni_naziv = skracene_tvrtke[0].get("ime")
        except Exception:
            pass

    return {
        "id": doc.id,
        "filename": doc.filename,
        "ocrresult": doc.ocrresult,
        "date": doc.date,
        "amount": doc.amount,
        "supplier_id": doc.supplier_id,
        "supplier_name_ocr": naziv,
        "supplier_oib": oib,
        "annotation": doc.annotation.annotations if doc.annotation else [],
        "sudreg_response": doc.sudreg_response,
        "skraceni_naziv": skraceni_naziv,
        "invoice_date": doc.invoice_date.isoformat() if doc.invoice_date else None,
        "due_date": doc.due_date.isoformat() if doc.due_date else None,
        "document_type": doc.document_type,
        "parsed": doc.parsed  # vraćamo parsed JSON kao string
    }

@router.patch("/{document_id}")
def update_document_supplier(
    document_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    supplier_id = payload.get("supplier_id")
    if supplier_id is None:
        raise HTTPException(status_code=400, detail="supplier_id je obavezan")

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.supplier_id = supplier_id
    db.commit()
    db.refresh(document)

    return {"message": "Supplier updated", "document_id": document.id}
