# core/routes/annotations.py

from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from core.database.connection import get_db
from core.database.models import DocumentAnnotation
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
    annotations: Dict[str, Any] = Body(...),  # očekuje dict
    db: Session = Depends(get_db)
):
    logger.info(f"POST /annotations/{document_id} - data: {annotations}")
    try:
        ann = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
        if not ann:
            ann = DocumentAnnotation(document_id=document_id)
            db.add(ann)
        # Ensure annotations is dict and serialize exactly once
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
