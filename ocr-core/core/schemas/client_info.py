from pydantic import BaseModel, EmailStr, constr

class ClientInfo(BaseModel):
    naziv_firme: constr(min_length=1)
    oib: constr(min_length=11, max_length=11)
    adresa: str
    kontakt_osoba: str | None = None
    email: EmailStr | None = None
    telefon: str | None = None
