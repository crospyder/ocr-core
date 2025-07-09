from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path
from sqlalchemy.orm import Session
from typing import List
from fastapi.responses import FileResponse
import shutil
import os
import logging
import traceback
from sqlalchemy import text

from core.database.connection import get_db
from core.database.models import Document, DocumentAnnotation
from core.schemas.documents import DocumentOut

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads"))

@router.get("/", response_model=List[DocumentOut])
def list_documents(
    document_type: str | None = Query(None, description="Vrsta dokumenta (URA, IRA, IZVOD, UGOVOR, ...)"),
    processed: bool = Query(default=False, description="Prikaži samo obrađene dokumente"),
    limit: int = Query(default=100, ge=1, le=1000, description="Koliko dokumenata dohvatiti"),
    order: str = Query(default="desc", regex="^(asc|desc)$", description="Sortiranje po datumu"),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    if processed:
        query = query.filter(Document.ocrresult != None)

    if order == "asc":
        query = query.order_by(Document.date.asc())
    else:
        query = query.order_by(Document.date.desc())

    documents = query.limit(limit).all()

    result = []
    for doc in documents:
        naziv = getattr(doc, "supplier_name_ocr", None) or (doc.supplier.name if doc.supplier else None)
        oib = getattr(doc, "supplier_oib", None) or (doc.supplier.oib if doc.supplier else None)

        result.append({
            "id": doc.id,
            "filename": doc.filename,
            "ocrresult": doc.ocrresult,
            "date": doc.date.isoformat() if doc.date else None,
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

    # Disk usage
    total_size_bytes = 0
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, fname)
            if os.path.isfile(fpath):
                total_size_bytes += os.path.getsize(fpath)
    total_size_mb = total_size_bytes / (1024 * 1024)

    usage = shutil.disk_usage(UPLOAD_DIR)
    free_mb = usage.free / (1024 * 1024)

    # Grupiranje po tipu dokumenta
    from sqlalchemy import func
    by_type_query = db.query(Document.document_type, func.count()).group_by(Document.document_type).all()
    by_type = {row[0]: row[1] for row in by_type_query if row[0]}

    return {
        "total_documents": total_docs,
        "processed_documents": processed_docs,
        "total_pdf_size_mb": round(total_size_mb, 2),
        "free_space_mb": round(free_mb, 2),
        "by_type": by_type
    }
    
@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    naziv = getattr(doc, "supplier_name_ocr", None) or (doc.supplier.name if doc.supplier else None)
    oib = getattr(doc, "supplier_oib", None) or (doc.supplier.oib if doc.supplier else None)

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
        "date": doc.date.isoformat() if doc.date else None,
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
        "parsed": doc.parsed
    }

@router.get("/{document_id}/file")
def get_document_file(document_id: int = Path(..., description="ID dokumenta"), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.filename:
        raise HTTPException(status_code=404, detail="Nema spremljenog PDF-a za ovaj dokument")

    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="PDF datoteka nije pronađena na disku")

    headers = {"Content-Disposition": f"inline; filename={doc.filename}"}
    return FileResponse(path=file_path, media_type="application/pdf", headers=headers)

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

@router.delete("/clear-all")
def clear_all_documents(db: Session = Depends(get_db)):
    try:
        logging.info("Početak brisanja anotacija")
        db.query(DocumentAnnotation).delete()
        db.commit()
        logging.info("Anotacije obrisane")

        logging.info("Početak brisanja dokumenata")
        db.query(Document).delete()
        db.commit()
        logging.info("Dokumenti obrisani")

        logging.info("Resetiranje AUTO_INCREMENT brojača")
        db.execute(text("ALTER TABLE document_annotations AUTO_INCREMENT = 1;"))
        db.execute(text("ALTER TABLE documents AUTO_INCREMENT = 1;"))
        db.commit()
        logging.info("Brojači resetirani")

        return {"message": "Sve tablice documents i document_annotations očišćene i brojači resetirani."}
    except Exception as e:
        db.rollback()
        logging.error(f"Greška prilikom resetiranja: {e}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Greška prilikom resetiranja: {e}")
