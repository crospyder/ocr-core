from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from fastapi.responses import FileResponse
import shutil
import os
import logging
from sqlalchemy import text, func
import json
from PyPDF2 import PdfReader
from core.database.connection import get_db
from core.database.models import Document, DocumentAnnotation, Partner
from core.schemas.documents import DocumentOut
from elasticsearch import Elasticsearch
from pydantic import BaseModel
from core.parsers.dispatcher import dispatch_parser
from core.utils.regex_common import detect_doc_type

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads"))
ES_INDEX = "spineict_ocr"

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
        db.execute(text("SET session_replication_role = replica;"))
        for table in CLEAR_ALL_TABLES:
            db.execute(text(f'TRUNCATE TABLE spineict_ocr."{table}" RESTART IDENTITY CASCADE;'))
        db.commit()
        db.execute(text("SET session_replication_role = DEFAULT;"))

        if os.path.exists(UPLOAD_DIR):
            for filename in os.listdir(UPLOAD_DIR):
                file_path = os.path.join(UPLOAD_DIR, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)

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
        annotations = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).all()
        for ann in annotations:
            db.delete(ann)
        if doc.filename:
            file_path = os.path.join(UPLOAD_DIR, doc.filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
        doc.document_type = "OBRISANI DOKUMENT"
        if not doc.annotation:
            doc.annotation = DocumentAnnotation(document_id=doc.id, annotations={})
            db.add(doc.annotation)
        annotations_data = doc.annotation.annotations or {}
        if isinstance(annotations_data, str):
            try:
                annotations_data = json.loads(annotations_data)
            except Exception:
                annotations_data = {}
        annotations_data["deleted_info"] = "Obrisao korisnik"
        doc.annotation.annotations = annotations_data
        db.commit()
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

class BatchDeleteRequest(BaseModel):
    ids: list[int]

@router.post("/batch_delete")
def batch_delete_documents(
    payload: BatchDeleteRequest,
    db: Session = Depends(get_db)
):
    deleted_ids = []
    for doc_id in payload.ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            continue
        try:
            annotations = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == doc_id).all()
            for ann in annotations:
                db.delete(ann)
            if doc.filename:
                file_path = os.path.join(UPLOAD_DIR, doc.filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            doc.document_type = "OBRISANI DOKUMENT"
            if not doc.annotation:
                doc.annotation = DocumentAnnotation(document_id=doc.id, annotations={})
                db.add(doc.annotation)
            annotations_data = doc.annotation.annotations or {}
            if isinstance(annotations_data, str):
                try:
                    annotations_data = json.loads(annotations_data)
                except Exception:
                    annotations_data = {}
            annotations_data["deleted_info"] = "Batch delete"
            doc.annotation.annotations = annotations_data
            db.commit()
            deleted_ids.append(doc_id)
            try:
                es = Elasticsearch("http://localhost:9200")
                if es.indices.exists(index=ES_INDEX):
                    es.delete_by_query(
                        index=ES_INDEX,
                        body={"query": {"match": {"id": doc_id}}},
                        refresh=True,
                        wait_for_completion=True
                    )
                    es.indices.refresh(index=ES_INDEX)
            except Exception as es_exc:
                logging.warning(f"Elasticsearch delete error: {es_exc}")
        except Exception as e:
            db.rollback()
            logging.error(f"Error deleting document {doc_id}: {e}")
            continue
    return {"message": f"Obrisano {len(deleted_ids)} dokumenata.", "deleted_ids": deleted_ids}

@router.post("/read-pdf-meta")
async def read_pdf_meta(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Datoteka nije PDF")
    contents = await file.read()
    try:
        pdf_file_like = BytesIO(contents)
        reader = PdfReader(pdf_file_like)
        meta = reader.metadata or {}
        meta_dict = {k[1:]: v for k, v in meta.items()}
        return {"metadata": meta_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška prilikom čitanja metapodataka: {e}")

@router.post("/reparse-all")
def reparse_all_documents(db: Session = Depends(get_db)):
    logging.info("Start reparse_all_documents")
    docs = db.query(Document).filter(Document.document_type != "OBRISANI DOKUMENT").all()
    updated = 0
    errors = []

    for doc in docs:
        logging.info(f"Parsing document id={doc.id} filename={doc.filename}")
        try:
            ocr_text = doc.ocrresult or ""
            if not ocr_text or len(ocr_text.strip()) < 10:
                raise Exception("Prazan ili premali OCR tekst")

            doc_type = doc.document_type or detect_doc_type(ocr_text)
            parser = dispatch_parser(doc_type)
            parsed = parser(ocr_text)
            if isinstance(parsed, str):
                try:
                    parsed = json.loads(parsed)
                except Exception:
                    raise Exception(f"Failed to parse 'parsed' field as JSON for doc_id={doc.id}")

            if not isinstance(parsed, dict):
                raise Exception(f"Parser vratio {type(parsed)} (nije dict) za doc_id={doc.id}")

            # Nadjačavanje parsed podataka s annotation.annotations ako postoje i imaju smisla
            ann_data = {}
            if doc.annotation and doc.annotation.annotations:
                try:
                    ann_data = doc.annotation.annotations
                    if isinstance(ann_data, str):
                        ann_data = json.loads(ann_data)
                    if not isinstance(ann_data, dict):
                        ann_data = {}
                except Exception as e:
                    logging.warning(f"Parsing annotation JSON failed for doc id={doc.id}: {e}")
                    ann_data = {}

            def get_value(key):
                # Prioritet: anotacija > parser rezultat
                return ann_data.get(key) if ann_data.get(key) is not None else parsed.get(key)

            # Update polja Document s nadjačanim vrijednostima
            doc.amount = get_value("amount")
            doc.invoice_number = get_value("invoice_number")
            doc.oib = get_value("oib")
            doc.supplier_oib = get_value("oib")
            doc.supplier_name_ocr = get_value("supplier_name") or get_value("partner_name") or parsed.get("supplier_name") or parsed.get("partner_name")
            doc.invoice_date = get_value("invoice_date")
            doc.due_date = get_value("due_date")
            doc.doc_number = get_value("invoice_number")

            doc.parsed = parsed

            updated += 1
        except Exception as e:
            logging.error(f"Error parsing document id={doc.id}: {e}")
            errors.append({
                "id": doc.id,
                "filename": doc.filename,
                "error": str(e),
                "ocrresult_preview": doc.ocrresult[:300] if doc.ocrresult else None
            })
            continue

    db.commit()
    logging.info(f"Re-parsing complete. Updated {updated} documents.")
    return {
        "message": f"Re-parsing complete. Updated {updated} documents.",
        "errors": errors,
        "total": len(docs)
    }
