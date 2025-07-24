from sqlalchemy.orm import Session
from . import models, schemas

# Products

def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    db.delete(db_product)
    db.commit()
    return db_product

# Services

def get_service(db: Session, service_id: int):
    return db.query(models.Service).filter(models.Service.id == service_id).first()

def get_services(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Service).offset(skip).limit(limit).all()

def create_service(db: Session, service: schemas.ServiceCreate):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

def update_service(db: Session, service_id: int, service: schemas.ServiceUpdate):
    db_service = get_service(db, service_id)
    if not db_service:
        return None
    for key, value in service.dict().items():
        setattr(db_service, key, value)
    db.commit()
    db.refresh(db_service)
    return db_service

def delete_service(db: Session, service_id: int):
    db_service = get_service(db, service_id)
    if not db_service:
        return None
    db.delete(db_service)
    db.commit()
    return db_service


# Invoices

def create_invoice(db: Session, invoice: schemas.InvoiceCreate):
    db_invoice = models.Invoice(
        partner_id=invoice.partner_id,
        account_id=invoice.account_id,
        dokument_broj=invoice.dokument_broj,
        tip_dokumenta=invoice.tip_dokumenta.value if hasattr(invoice.tip_dokumenta, 'value') else invoice.tip_dokumenta,
        datum_izdavanja=invoice.datum_izdavanja,
        datum_valute=invoice.datum_valute,
        status=invoice.status,
        ukupno=invoice.ukupno,
        ukupno_pdv=invoice.ukupno_pdv,
        placeno=invoice.placeno,
        fiskaliziran=invoice.fiskaliziran,
        nacin_placanja=invoice.nacin_placanja,
        oznaka_operatera=invoice.oznaka_operatera,
        datum_fiskalizacije=invoice.datum_fiskalizacije,
        vrijeme_fiskalizacije=invoice.vrijeme_fiskalizacije,
        poziv_na_broj=invoice.poziv_na_broj,
    )
    db.add(db_invoice)
    db.flush()

    for stavka in invoice.stavke:
        db_item = models.InvoiceItem(
            invoice_id=db_invoice.id,
            proizvod_id=stavka.proizvod_id,
            usluga_id=stavka.usluga_id,
            sifra=stavka.sifra,
            naziv=stavka.naziv,
            jedinica_mjere=stavka.jedinica_mjere,
            kolicina=stavka.kolicina,
            pdv_postotak=stavka.pdv_postotak,  # ispravljeno
            cijena=stavka.cijena,
            iznos=stavka.iznos,
            dodatni_opis=stavka.dodatni_opis,
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_invoice)
    return db_invoice


def get_invoice(db: Session, invoice_id: int):
    return db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()

def get_invoices(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Invoice).offset(skip).limit(limit).all()

def update_invoice(db: Session, invoice_id: int, invoice: schemas.InvoiceCreate):
    db_invoice = get_invoice(db, invoice_id)
    if not db_invoice:
        return None

    for key, value in invoice.dict(exclude={"stavke"}).items():
        if key == "tip_dokumenta":
            setattr(db_invoice, key, value.value if hasattr(value, 'value') else value)
        else:
            setattr(db_invoice, key, value)

    db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice_id).delete()
    for stavka in invoice.stavke:
        db_item = models.InvoiceItem(
            invoice_id=invoice_id,
            proizvod_id=stavka.proizvod_id,
            usluga_id=stavka.usluga_id,
            sifra=stavka.sifra,
            naziv=stavka.naziv,
            jedinica_mjere=stavka.jedinica_mjere,
            kolicina=stavka.kolicina,
            pdv_postotak=stavka.pdv_postotak,  # ispravljeno
            cijena=stavka.cijena,
            iznos=stavka.iznos,
            dodatni_opis=stavka.dodatni_opis,
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_invoice)
    return db_invoice
