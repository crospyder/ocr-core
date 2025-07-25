from pydantic import BaseModel, validator, ConfigDict
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from decimal import Decimal
import json

class SupplierOut(BaseModel):
    id: int
    name: Optional[str] = None
    oib: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentBase(BaseModel):
    filename: str
    ocrresult: Optional[str] = None
    date: Optional[datetime] = None
    amount: Optional[Decimal] = None  # Promijenjeno u Decimal
    supplier_name_ocr: Optional[str] = None

class DocumentOut(DocumentBase):
    id: int
    supplier: Optional[SupplierOut] = None
    supplier_oib: Optional[str] = None
    annotation: Optional[List[Dict[str, Any]]] = None
    sudreg_response: Optional[Union[Dict[str, Any], str]] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    document_type: Optional[str] = None
    parsed: Optional[Dict[str, Any]] = None
    doc_number: Optional[str] = None  # Broj računa

    @validator('annotation', pre=True, always=True)
    def validate_annotation(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return []

    @validator('sudreg_response', pre=True, always=True)
    def parse_sudreg_response(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v

    @validator('parsed', pre=True, always=True)
    def parse_parsed_field(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return v
        return v

    # Dodan validator za amount
    @validator('amount', pre=True, always=True)
    def validate_amount(cls, v):
        if isinstance(v, str):
            v = v.replace(",", ".")  # Osiguranje da se koristi točka umjesto zareza
            return Decimal(v) if v else None
        if isinstance(v, (float, int, Decimal)):
            return Decimal(v)
        return None

    model_config = ConfigDict(from_attributes=True)  # Samo jednom na kraju klase
