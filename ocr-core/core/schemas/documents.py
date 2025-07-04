from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    ocrresult: Optional[str] = None
    date: Optional[datetime] = None
    amount: Optional[int] = None

class DocumentOut(DocumentBase):
    id: int
    supplier_id: Optional[int] = None
    annotation: Optional[List[Dict[str, Any]]] = None  # annotation može biti None ili lista dictova

    @validator('annotation', pre=True, always=True)
    def validate_annotation(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        # Ako nije lista (npr. dict ili nešto drugo), vrati praznu listu
        return []

    class Config:
        orm_mode = True
