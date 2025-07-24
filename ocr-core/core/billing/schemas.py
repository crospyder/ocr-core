from enum import Enum
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Products ---

class ProductBase(BaseModel):
    sifra: str
    naziv: str
    jedinica_mjere: str
    cijena: float
    pdv_postotak: int

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

class ProductOut(ProductBase):
    id: int

    class Config:
        orm_mode = True

# --- Services ---

class ServiceBase(BaseModel):
    sifra: str
    naziv: str
    jedinica_mjere: str
    cijena: float
    pdv_postotak: int

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(ServiceBase):
    pass

class ServiceOut(ServiceBase):
    id: int

    class Config:
        orm_mode = True

# --- Invoice ---

class TipDokumentaEnum(str, Enum):
    racun = "racun"
    ponuda = "ponuda"
    racun_otpremnica = "racun-otpremnica"

class InvoiceItemBase(BaseModel):
    proizvod_id: Optional[int] = None
    usluga_id: Optional[int] = None
    sifra: str
    naziv: str
    jedinica_mjere: str
    kolicina: float
    pdv_postotak: int
    cijena: float
    iznos: float
    dodatni_opis: Optional[str] = ""

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemOut(InvoiceItemBase):
    id: int

    class Config:
        orm_mode = True

class InvoiceBase(BaseModel):
    partner_id: int
    account_id: int
    dokument_broj: str
    tip_dokumenta: TipDokumentaEnum
    datum_izdavanja: datetime
    datum_valute: datetime
    status: str
    ukupno: float
    ukupno_pdv: float
    placeno: bool
    fiskaliziran: Optional[bool] = False
    nacin_placanja: Optional[str] = None
    oznaka_operatera: Optional[str] = None
    datum_fiskalizacije: Optional[datetime] = None
    vrijeme_fiskalizacije: Optional[datetime] = None
    poziv_na_broj: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    stavke: List[InvoiceItemCreate]

class InvoiceOut(InvoiceBase):
    id: int
    stavke: List[InvoiceItemOut]

    class Config:
        orm_mode = True

# --- Account config ---

class AccountConfigSchema(BaseModel):
    id: int
    naziv_firme: str
    oib: str
    adresa: str
    broj_licenci: int

    class Config:
        orm_mode = True

class ClientBase(BaseModel):
    naziv_firme: str
    oib: str
    adresa: str | None = None
    broj_licenci: int | None = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    pass

class ClientOut(ClientBase):
    id: int

    class Config:
        orm_mode = True