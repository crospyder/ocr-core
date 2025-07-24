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

# Tablice koje se brišu u clear-all (izostavljene invoices, invoice_items, products, services)
CLEAR_ALL_TABLES = [
    "accounts",
    "clients",
    "document_annotations",
    "documents",
    "mail_accounts",
    "mail_processed",
    "parsed_oib",
    "partneri",
    "software_info",
    "users",
]

@router.delete("/clear-all")
def clear_all_data(db: Session = Depends(get_db)):
    try:
        # Isključi foreign key provjere da ne smetaju
        db.execute(text("SET session_replication_role = replica;"))

        # Brisanje tablica i reset sekvenci s kaskadom
        for table in CLEAR_ALL_TABLES:
            db.execute(text(f'TRUNCATE TABLE spineict_ocr."{table}" RESTART IDENTITY CASCADE;'))

        db.commit()

        # Vrati FK provjere na normalu
        db.execute(text("SET session_replication_role = DEFAULT;"))

        # Obrisi uploadane datoteke
        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)

        # Obriši Elasticsearch indeks
        es = Elasticsearch("http://localhost:9200")
        if es.indices.exists(index=ES_INDEX):
            es.indices.delete(index=ES_INDEX)

        return {"message": "Podaci uspješno obrisani, sekvence resetirane."}
    except Exception as e:
        db.rollback()
        logging.error(f"Greška prilikom brisanja podataka: {e}")
        raise HTTPException(status_code=500, detail="Greška prilikom brisanja podataka.")


@router.get("/", response_model=dict)
def list_documents(
    document_type: str | None = Query(None),
    processed: bool = Query(default=False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    order: str = Query(default="desc", regex="^(asc|desc)$"),
    supplier_oib: str | None = Query(None),
    include_deleted: bool = Query(default=False),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    if document_type:
        query = query.filter(Document.document_type == document_type)

    if not include_deleted:
        query = query.filter(Document.document_type != "OBRISANI DOKUMENT")

    if processed:
        query = query.filter(Document.ocrresult.isnot(None))

    if supplier_oib:
        query = query.filter(Document.supplier_oib == supplier_oib)

    total = query.count()

    query = query.order_by(Document.date.asc() if order == "asc" else Document.date.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    documents = query.all()

    def parse_parsed_field(doc):
        if isinstance(doc.parsed, str):
            try:
                return json.loads(doc.parsed)
            except Exception:
                return None
        return doc.parsed

    items = [
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

    return {"items": items, "total": total}

@router.get("/stats-info")
def documents_stats(db: Session = Depends(get_db)):
    total_docs = db.query(Document).filter(Document.document_type != "OBRISANI DOKUMENT").count()
    processed_docs = db.query(Document).filter(Document.ocrresult.isnot(None), Document.document_type != "OBRISANI DOKUMENT").count()

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

    by_type_query = db.query(Document.document_type, func.count()).filter(Document.document_type != "OBRISANI DOKUMENT").group_by(Document.document_type).all()
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
        .filter(Document.document_type != "OBRISANI DOKUMENT")
        .group_by(Document.supplier_name_ocr)
        .order_by(func.count(Document.id).desc())
        .limit(10)
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

@router.put("/{document_id}/update_type")
def update_document_type(
    document_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    new_type = payload.get("new_type")
    if not new_type:
        raise HTTPException(status_code=400, detail="Missing new_type in payload")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.document_type = new_type
    db.commit()

    return {"message": f"Document {document_id} type updated to {new_type}"}

@router.patch("/{document_id}")
def update_document(
    document_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Podržana polja za update
    updatable_fields = [
        "document_type",
        "invoice_number",
        "date_invoice",
        "date_valute",
        "amount",
        "oib",
        "supplier_name_ocr",
        "supplier_oib",
        "partner_name",
        "supplier_id"
    ]

    for field in updatable_fields:
        if field in payload:
            setattr(doc, field, payload[field])

    db.commit()
    return {"message": "Dokument ažuriran", "document_id": doc.id}

@router.delete("/{document_id}")
def delete_document(document_id: int = Path(...), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Obriši povezane anotacije prvo
        annotations = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).all()
        for ann in annotations:
            db.delete(ann)

        # Obrisi fajl s diska
        if doc.filename:
            file_path = os.path.join(UPLOAD_DIR, doc.filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

        # Update document_type i dodaj info u anotacije
        doc.document_type = "OBRISANI DOKUMENT"

        if not doc.annotation:
            doc.annotation = DocumentAnnotation(document_id=doc.id, annotations={})
            db.add(doc.annotation)

        annotations_data = doc.annotation.annotations or {}
        annotations_data["deleted_info"] = "Obrisao korisnik"
        doc.annotation.annotations = annotations_data

        db.commit()

        # Obrisi iz Elasticsearcha
        try:
            es = Elasticsearch("http://localhost:9200")
            if es.indices.exists(index=ES_INDEX):
                es.delete_by_query(
                    index=ES_INDEX,
                    body={"query": {"match": {"id": document_id}}},
                    refresh=True,
                    wait_for_completion=True
                )
                es.indices.refresh(index=ES_INDEX)
        except Exception as es_exc:
            logging.warning(f"Elasticsearch delete error: {es_exc}")

        return {"message": f"Document {document_id} marked as deleted, PDF removed."}
    except Exception as e:
        db.rollback()
        logging.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting document: {e}")
