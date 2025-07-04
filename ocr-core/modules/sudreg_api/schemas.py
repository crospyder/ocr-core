from pydantic import BaseModel, Field, validator
from typing import Optional

class Address(BaseModel):
    # Ovisno o strukturi adrese, ovdje možeš nadopuniti polja
    # ako ih dobiješ iz Sudreg API-ja
    ulica_i_broj: Optional[str] = None
    mjesto: Optional[str] = None
    postanski_broj: Optional[str] = None

class SudregCompany(BaseModel):
    oib: str = Field(..., min_length=11, max_length=11)
    naziv: Optional[str] = None
    adresa: Optional[Address] = None
    status: Optional[str] = None  # ili složeniji model, ako želiš
    datum_osnivanja: Optional[str] = None
    djelatnost: Optional[str] = None

    @validator("oib", pre=True)
    def oib_to_str(cls, v):
        if v is None:
            raise ValueError("OIB ne smije biti prazan")
        return str(v)
