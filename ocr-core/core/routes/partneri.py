# core/routes/partneri.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database.models import Partner, Document
from ..database.connection import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/partneri", tags=["partneri"])

class PartnerOut(BaseModel):
    id: int
    naziv: str
    oib: str
    adresa: str
    kontakt_telefon: str | None
    kontakt_email: str | None
    kontakt_osoba: str | None

    class Config:
        orm_mode = True


@router.get("/", response_model=list[PartnerOut])
def get_partneri(db: Session = Depends(get_db)):
    partneri = db.query(Partner).all()
    return partneri


def sync_partner_from_document(db: Session, document_id: int):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    naziv = doc.supplier_name_ocr or ""
    oib = doc.supplier_oib
    if not oib:
        raise HTTPException(status_code=400, detail="Document does not have supplier OIB")

    parsed = doc.parsed or {}
    adresa = parsed.get("address", "") or ""
    kontakt_telefon = parsed.get("contact_phone")
    kontakt_email = parsed.get("contact_email")
    kontakt_osoba = parsed.get("contact_person")

    partner = db.query(Partner).filter(Partner.oib == oib).first()
    if partner:
        updated = False
        if partner.naziv != naziv:
            partner.naziv = naziv
            updated = True
        if partner.adresa != adresa:
            partner.adresa = adresa
            updated = True
        if partner.kontakt_telefon != kontakt_telefon:
            partner.kontakt_telefon = kontakt_telefon
            updated = True
        if partner.kontakt_email != kontakt_email:
            partner.kontakt_email = kontakt_email
            updated = True
        if partner.kontakt_osoba != kontakt_osoba:
            partner.kontakt_osoba = kontakt_osoba
            updated = True

        if updated:
            db.add(partner)
            db.commit()
            db.refresh(partner)
    else:
        novi_partner = Partner(
            naziv=naziv,
            oib=oib,
            adresa=adresa,
            kontakt_telefon=kontakt_telefon,
            kontakt_email=kontakt_email,
            kontakt_osoba=kontakt_osoba,
        )
        db.add(novi_partner)
        db.commit()
        db.refresh(novi_partner)
