# backend/routes/annotations.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from core.database.connection import get_db
from core.database.models import DocumentAnnotation

router = APIRouter()

@router.get("/{document_id}", response_model=Dict[str, List[Dict]])
def get_annotation(document_id: int, db: Session = Depends(get_db)):
    annotation = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
    if not annotation:
        return {"annotations": []}  # vraćamo praznu listu tagova ako nema anotacija
    return {"annotations": annotation.annotations}

@router.post("/{document_id}")
def save_annotation(document_id: int, annotations: List[Dict], db: Session = Depends(get_db)):
    annotation = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == document_id).first()
    if annotation:
        annotation.annotations = annotations
    else:
        annotation = DocumentAnnotation(document_id=document_id, annotations=annotations)
        db.add(annotation)
    db.commit()
    return {"status": "ok"}

print("✅ annotations.py loaded")
