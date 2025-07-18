from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path
from sqlalchemy.orm import Session
from typing import List
from fastapi.responses import FileResponse
import shutil
import os
import logging
from sqlalchemy import text, func
import json

from core.database.connection import get_db
from core.database.models import Document, DocumentAnnotation, Partner
from core.schemas.documents import DocumentOut
from elasticsearch import Elasticsearch

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads"))
ES_INDEX = "spineict_ocr"

@router.get("/", response_model=List[DocumentOut])
def list_documents(
    document_type: str | None = Query(None),
    processed: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=1000),
    order: str = Query(default="desc", regex="^(asc|desc)$"),
    supplier_oib: str | None = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    if processed:
        query = query.filter(Document.ocrresult.isnot(None))

    if supplier_oib:
        query = query.filter(Document.supplier_oib == supplier_oib)

    query = query.order_by(Document.date.asc() if order == "asc" else Document.date.desc())
    documents = query.limit(limit).all()

    def parse_parsed_field(doc):
        if isinstance(doc.parsed, str):
            try:
                return json.loads(doc.parsed)
            except Exception:
                return None
        return doc.parsed

    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "ocrresult": doc.ocrresult,
            "date": doc.date.isoformat() if doc.date else None,
            "amount": doc.amount,
            "supplier_id": doc.supplier_id,
            "supplier_name_ocr": doc.supplier_name_ocr,
            "supplier_oib": doc.supplier_oib,
            "annotation": doc.annotation.annotations if doc.annotation else [],
            "invoice_date": doc.invoice_date.isoformat() if doc.invoice_date else None,
            "due_date": doc.due_date.isoformat() if doc.due_date else None,
            "document_type": doc.document_type,
            "parsed": parse_parsed_field(doc),
            "doc_number": doc.doc_number,
        }
        for doc in documents
    ]

@router.get("/stats-info")
def documents_stats(db: Session = Depends(get_db)):
    total_docs = db.query(Document).count()
    processed_docs = db.query(Document).filter(Document.ocrresult.isnot(None)).count()

    total_size_bytes = (
        sum(
            os.path.getsize(os.path.join(UPLOAD_DIR, f))
            for f in os.listdir(UPLOAD_DIR)
            if os.path.isfile(os.path.join(UPLOAD_DIR, f))
        )
        if os.path.exists(UPLOAD_DIR) else 0
    )

    total_size_mb = total_size_bytes / (1024 * 1024)
    usage = shutil.disk_usage(UPLOAD_DIR) if os.path.exists(UPLOAD_DIR) else None
    free_mb = usage.free / (1024 * 1024) if usage else 0

    by_type_query = db.query(Document.document_type, func.count()).group_by(Document.document_type).all()
    by_type = {row[0]: row[1] for row in by_type_query if row[0]}

    return {
        "total_documents": total_docs,
        "processed_documents": processed_docs,
        "total_pdf_size_mb": round(total_size_mb, 2),
        "free_space_mb": round(free_mb, 2),
        "by_type": by_type
    }

@router.get("/top-partners")
def top_partners(db: Session = Depends(get_db)):
    results = (
        db.query(Document.supplier_name_ocr, func.count(Document.id))
        .group_by(Document.supplier_name_ocr)
        .order_by(func.count(Document.id).desc())
        .limit(10)  # PROMJENA: limit je sad 10
        .all()
    )

    return [{"partner": r[0] or "Nepoznati dobavljač", "document_count": r[1]} for r in results]

@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    parsed_value = doc.parsed
    if isinstance(parsed_value, str):
        try:
            parsed_value = json.loads(parsed_value)
        except Exception:
            parsed_value = None

    doc_dict = {
        "id": doc.id,
        "filename": doc.filename,
        "ocrresult": doc.ocrresult,
        "date": doc.date,
        "amount": doc.amount,
        "supplier_id": doc.supplier_id,
        "supplier_name_ocr": doc.supplier_name_ocr,
        "supplier_oib": doc.supplier_oib,
        "annotation": doc.annotation.annotations if doc.annotation else [],
        "sudreg_response": doc.sudreg_response,
        "invoice_date": doc.invoice_date,
        "due_date": doc.due_date,
        "document_type": doc.document_type,
        "parsed": parsed_value,
        "doc_number": doc.doc_number,
    }

    return DocumentOut.model_validate(doc_dict)

@router.get("/by-oib/{oib}", response_model=List[DocumentOut])
def get_documents_by_oib(oib: str, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.supplier_oib == oib).order_by(Document.date.desc()).all()
    if not docs:
        raise HTTPException(status_code=404, detail="Nema dokumenata za ovog partnera")

    def parse_parsed_field(doc):
        if isinstance(doc.parsed, str):
            try:
                return json.loads(doc.parsed)
            except Exception:
                return None
        return doc.parsed

    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "ocrresult": doc.ocrresult,
            "date": doc.date.isoformat() if doc.date else None,
            "amount": doc.amount,
            "supplier_id": doc.supplier_id,
            "supplier_name_ocr": doc.supplier_name_ocr,
            "supplier_oib": doc.supplier_oib,
            "annotation": doc.annotation.annotations if doc.annotation else [],
            "invoice_date": doc.invoice_date.isoformat() if doc.invoice_date else None,
            "due_date": doc.due_date.isoformat() if doc.due_date else None,
            "document_type": doc.document_type,
            "parsed": parse_parsed_field(doc),
            "doc_number": doc.doc_number,
        }
        for doc in docs
    ]

@router.get("/{document_id}/file")
def get_document_file(document_id: int = Path(...), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.filename:
        raise HTTPException(status_code=404, detail="PDF datoteka nije pronađena")

    file_path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="PDF nije na disku")

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

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.supplier_id = supplier_id
    db.commit()
    return {"message": "Dobavljač ažuriran", "document_id": doc.id}

@router.delete("/clear-all")
def clear_all_documents(db: Session = Depends(get_db)):
    try:
        db.query(DocumentAnnotation).delete()
        db.query(Document).delete()
        db.query(Partner).delete()
        db.commit()

        db.execute(text("ALTER SEQUENCE document_annotations_id_seq RESTART WITH 1;"))
        db.execute(text("ALTER SEQUENCE documents_id_seq RESTART WITH 1;"))
        db.execute(text("ALTER SEQUENCE partneri_id_seq RESTART WITH 1;"))
        db.commit()

        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)

        try:
            es = Elasticsearch("http://localhost:9200")
            if es.indices.exists(index=ES_INDEX):
                es.delete_by_query(index=ES_INDEX, body={"query": {"match_all": {}}})
                es.indices.refresh(index=ES_INDEX)
                logging.info(f"Elasticsearch indeks '{ES_INDEX}' očišćen i osvježen.")
        except Exception as es_exc:
            logging.warning(f"Elasticsearch clean error: {es_exc}")

        logging.info("Svi dokumenti, partneri i anotacije su obrisani, PDF-ovi i ES indeks resetirani.")
        return {"message": "Svi dokumenti, partneri i anotacije su obrisani, PDF-ovi i ES indeks resetirani."}
    except Exception as e:
        db.rollback()
        logging.error(f"Greška: {e}")
        raise HTTPException(status_code=500, detail=f"Greška: {e}")
