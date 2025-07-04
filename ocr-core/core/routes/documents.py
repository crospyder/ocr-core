from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from core.database.connection import get_db
from core.database.models import Document
from core.schemas.documents import DocumentOut

router = APIRouter()

@router.get("/", response_model=List[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()
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
            "annotation": doc.annotation.annotations if doc.annotation else []
        })
    return result

@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    naziv = getattr(doc, "supplier_name_ocr", None) or (doc.supplier.name if doc.supplier else None)
    oib = getattr(doc, "supplier_oib", None) or (doc.supplier.oib if doc.supplier else None)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "ocrresult": doc.ocrresult,
        "date": doc.date,
        "amount": doc.amount,
        "supplier_id": doc.supplier_id,
        "supplier_name_ocr": naziv,
        "supplier_oib": oib,
        "annotation": doc.annotation.annotations if doc.annotation else []
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
