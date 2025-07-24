from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from core.database.connection import get_db
from core.database.models import DocumentAnnotation, Document
import json
import logging

router = APIRouter()
logger = logging.getLogger("annotations")
logger.setLevel(logging.INFO)

def safe_load_json(data):
    if not data:
        return {}
    try:
        result = json.loads(data)
        if isinstance(result, str):
            result = json.loads(result)
        return result
    except Exception as e:
        logger.error(f"JSON parsing error: {e}")
        return {}

@router.get("/{document_id}")
def get_annotation(document_id: int, db: Session = Depends(get_db)):
    logger.info(f"GET /annotations/{document_id}")
    ann = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
    if not ann or not ann.annotations:
        logger.info(f"Document {document_id} - no annotation found.")
        return {"annotations": {}}
    try:
        data = safe_load_json(ann.annotations)
        logger.info(f"Document {document_id} - annotation loaded: {data}")
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
    logger.info(f"POST /annotations/{document_id} - data: {annotations}")
    try:
        # Check if annotation exists in the database
        ann = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
        if not ann:
            ann = DocumentAnnotation(document_id=document_id)
            db.add(ann)

        # Save annotations in JSON format
        if isinstance(annotations, dict):
            ann.annotations = json.dumps(annotations, ensure_ascii=False)
        else:
            try:
                parsed = json.loads(annotations)
                ann.annotations = json.dumps(parsed, ensure_ascii=False)
            except Exception:
                ann.annotations = "{}"
        db.commit()
        logger.info(f"Annotation for document {document_id} saved.")

        # Update relevant fields in the documents table based on annotations
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            # Mapping for annotations and fields in the documents table
            mapping = {
                "invoice_number": "doc_number",
                "date_invoice": "invoice_date",
                "date_valute": "due_date",
                "amount": "amount",  # This will be converted
                "oib": "supplier_oib",
                "supplier_name": "supplier_name_ocr",  # This is correct for update
            }

            # Update only those fields which are changed
            for ann_field, doc_field in mapping.items():
                if ann_field in annotations:
                    new_value = annotations[ann_field]

                    # If amount, replace comma with dot
                    if ann_field == "amount" and isinstance(new_value, str):
                        new_value = new_value.replace(",", ".")

                    # If amount, convert to decimal number
                    if ann_field == "amount":
                        try:
                            new_value = float(new_value)
                        except ValueError:
                            new_value = None

                    if getattr(doc, doc_field) != new_value:  # Check if it's new
                        setattr(doc, doc_field, new_value)

            db.commit()
            logger.info(f"Document {document_id} updated with new annotation values.")

        return {"status": "ok"}

    except Exception as e:
        logger.error(f"Error saving annotation for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Greška pri spremanju oznaka")

@router.get("/export/all")
def export_all_annotations(db: Session = Depends(get_db)):
    logger.info("EXPORT /annotations/export/all")
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
    logger.info(f"Exported {len(records)} annotated docs.")
    return {"data": records}

print("✅ core/routes/annotations.py loaded")
