from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class SupplierOut(BaseModel):
    id: int
    name: Optional[str] = None
    oib: Optional[str] = None

    class Config:
        orm_mode = True

class DocumentBase(BaseModel):
    filename: str
    ocrresult: Optional[str] = None
    date: Optional[datetime] = None
    amount: Optional[int] = None
    supplier_name_ocr: Optional[str] = None

class DocumentOut(DocumentBase):
    id: int
    supplier: Optional[SupplierOut] = None
    supplier_oib: Optional[str] = None  # <---- OVDJE DODATI
    annotation: Optional[List[Dict[str, Any]]] = None

    @validator('annotation', pre=True, always=True)
    def validate_annotation(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return []

    class Config:
        orm_mode = True

