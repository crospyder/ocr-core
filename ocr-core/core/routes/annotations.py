# core/routes/annotations.py
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from core.database.connection import get_db
from core.database.models import DocumentAnnotation, Document
import json
import logging

router = APIRouter()
logger = logging.getLogger("annotations")
logger.setLevel(logging.DEBUG)  # DEBUG da hvata sve logove

def safe_load_json(data):
    if not data:
        logger.debug("safe_load_json: empty data, returning empty dict")
        return {}
    try:
        result = json.loads(data)
        if isinstance(result, str):
            result = json.loads(result)
        logger.debug(f"safe_load_json: parsed data {result}")
        return result
    except Exception as e:
        logger.error(f"JSON parsing error: {e}")
        return {}

@router.get("/{document_id}")
def get_annotation(document_id: int, db: Session = Depends(get_db)):
    logger.debug(f"GET /annotations/{document_id} called")
    ann = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
    if not ann or not ann.annotations:
        logger.debug(f"Document {document_id} - no annotation found or empty annotations")
        return {"annotations": {}}
    try:
        data = safe_load_json(ann.annotations)
        logger.debug(f"Document {document_id} - loaded annotation: {data}")
        return {"annotations": data}
    except Exception as e:
        logger.error(f"Failed to parse annotation for document {document_id}: {e}")
        return {"annotations": {}}

@router.post("/{document_id}")
def save_annotation(
    document_id: int,
    annotations: Dict[str, Any] = Body(...),  # Expecting dict
    db: Session = Depends(get_db)
):
    logger.debug(f"POST /annotations/{document_id} - received data: {annotations}")
    try:
        # fallback za due_date ako nije poslan ili je prazan
        if not annotations.get("due_date") and annotations.get("date_invoice"):
            annotations["due_date"] = annotations["date_invoice"]
            logger.debug(f"due_date not present, fallback to date_invoice: {annotations['due_date']}")

        ann = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
        if not ann:
            logger.debug(f"No existing annotation for document {document_id}, creating new")
            ann = DocumentAnnotation(document_id=document_id)
            db.add(ann)

        if isinstance(annotations, dict):
            ann.annotations = json.dumps(annotations, ensure_ascii=False)
        else:
            try:
                parsed = json.loads(annotations)
                ann.annotations = json.dumps(parsed, ensure_ascii=False)
            except Exception:
                ann.annotations = "{}"
        db.commit()
        logger.debug(f"Annotation for document {document_id} saved to DB")

        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            mapping = {
                "supplier_name": "supplier_name_ocr",
                "oib": "supplier_oib",
                "date_invoice": "invoice_date",
                "due_date": "due_date",
                "invoice_number": "doc_number",
                "amount": "amount",
            }

            for ann_field, doc_field in mapping.items():
                if ann_field in annotations:
                    new_value = annotations[ann_field]
                    logger.debug(f"Checking field '{ann_field}': new_value={new_value}")

                    if ann_field == "amount" and isinstance(new_value, str):
                        new_value = new_value.replace(",", ".")
                        logger.debug(f"Normalized amount: {new_value}")

                    if ann_field == "amount":
                        try:
                            new_value = float(new_value)
                        except ValueError:
                            new_value = None
                        logger.debug(f"Converted amount to float: {new_value}")

                    current_value = getattr(doc, doc_field)
                    if current_value != new_value:
                        logger.debug(f"Updating document field '{doc_field}' from '{current_value}' to '{new_value}'")
                        setattr(doc, doc_field, new_value)

            db.commit()
            logger.debug(f"Document {document_id} updated with new annotation values")

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Error saving annotation for document {document_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Greška pri spremanju oznaka")

@router.get("/export/all")
def export_all_annotations(db: Session = Depends(get_db)):
    logger.debug("EXPORT /annotations/export/all called")
    records = []
    docs = db.query(DocumentAnnotation).all()
    for ann in docs:
        try:
            tags = safe_load_json(ann.annotations)
            row = dict(tags)
        except Exception as e:
            logger.warning(f"Annotation parse fail for doc {ann.document_id}: {e}")
            row = {}
        row["document_id"] = ann.document_id
        records.append(row)
    logger.debug(f"Exported {len(records)} annotated docs")
    return {"data": records}

print("✅ core/routes/annotations.py loaded")
