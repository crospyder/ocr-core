from sqlalchemy import (Column, Integer, BigInteger,  String, Numeric, Boolean, Text, DateTime, ForeignKey, TIMESTAMP, Date)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database.connection import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sifra = Column(String(50), unique=True, nullable=False)
    naziv = Column(String(255), nullable=False)
    opis = Column(Text)
    cijena = Column(Numeric(12, 2), nullable=False)
    pdv_postotak = Column(Numeric(5, 2), nullable=False, default=25.0)
    jedinica_mjere = Column(String(20), nullable=False, default="kom")
    aktivan = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    sifra = Column(String(50), unique=True, nullable=False)
    naziv = Column(String(255), nullable=False)
    opis = Column(Text)
    cijena = Column(Numeric(12, 2), nullable=False)
    pdv_postotak = Column(Numeric(5, 2), nullable=False, default=25.0)
    jedinica_mjere = Column(String(20), nullable=False, default="kom")
    aktivan = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    naziv_firme = Column(String(255), nullable=False)
    oib = Column(String(20), nullable=False, unique=True)
    db_name = Column(String(255), nullable=False, unique=True)
    broj_licenci = Column(Integer, nullable=True)
    archived_at = Column(TIMESTAMP, nullable=True)
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    adresa = Column(String(255), nullable=True)
    kontakt_osoba = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    telefon = Column(String(50), nullable=True)
    licenca_pocetak = Column(Date, nullable=True)
    licenca_kraj = Column(Date, nullable=True)
    status_licence = Column(String(50), nullable=False, default="active")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=True)

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, nullable=False)
    account_id = Column(BigInteger, ForeignKey("clients.id"), nullable=True)
    tip_dokumenta = Column(String(50), nullable=False)
    datum_izdavanja = Column(DateTime, nullable=False)
    datum_valute = Column(DateTime, nullable=False)
    status = Column(String(50), nullable=True)
    ukupno = Column(Numeric(12, 2), nullable=False)
    ukupno_pdv = Column(Numeric(12, 2), nullable=False)
    placeno = Column(Boolean, default=False)
    fiskaliziran = Column(Boolean, default=False)
    nacin_placanja = Column(String(50), nullable=True)
    oznaka_operatera = Column(String(50), nullable=True)
    datum_fiskalizacije = Column(DateTime, nullable=True)
    vrijeme_fiskalizacije = Column(DateTime, nullable=True)
    poziv_na_broj = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())
    stavke = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    dokument_broj = Column(String(50), nullable=False)


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    proizvod_id = Column(Integer, nullable=True)
    usluga_id = Column(Integer, nullable=True)
    sifra = Column(String(50), nullable=False)
    naziv = Column(Text, nullable=False)
    jedinica_mjere = Column(String(20), nullable=False)
    kolicina = Column(Numeric(14,4), nullable=False)
    pdv_postotak = Column(Numeric(5,2), nullable=False)
    cijena = Column(Numeric(14,4), nullable=False)
    iznos = Column(Numeric(14,2), nullable=False)
    dodatni_opis = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=False), server_default=func.now())
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())
    invoice = relationship("Invoice", back_populates="stavke")
