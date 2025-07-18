from sqlalchemy import JSON, Column, Integer, String, ForeignKey, TIMESTAMP, Text, func, UniqueConstraint, Date, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Boolean

Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    naziv_firme = Column(String(255), nullable=False)
    oib = Column(String(20), nullable=False, unique=True)
    db_name = Column(String(255), nullable=False, unique=True)
    broj_licenci = Column(Integer, nullable=True)
    archived_at = Column(TIMESTAMP, server_default=func.now())
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

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    ocrresult = Column(Text)
    supplier_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    supplier_name_ocr = Column(String(255), nullable=True)
    supplier_oib = Column(String(11), nullable=True)
    date = Column(TIMESTAMP, nullable=True)
    amount = Column(Numeric(12, 2), nullable=True)
    archived_at = Column(TIMESTAMP, server_default=func.now())
    supplier = relationship("Client", backref="documents")
    annotation = relationship("DocumentAnnotation", back_populates="document", uselist=False)
    sudreg_response = Column(Text, nullable=True)
    document_type = Column(String(50), nullable=True)
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    parsed = Column(JSON, nullable=True)
    doc_number = Column(String(255), nullable=True)  # Broj računa
    hash = Column(String(64), unique=True, index=True, nullable=True)  # <--- hash polje


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    role = Column(String(50), default="user")
    archived_at = Column(TIMESTAMP, server_default=func.now())

class DocumentAnnotation(Base):
    __tablename__ = "document_annotations"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True, index=True, nullable=False)
    annotations = Column(JSON, nullable=False)
    document = relationship("Document", back_populates="annotation")

class ParsedOIB(Base):
    __tablename__ = "parsed_oib"
    __table_args__ = (UniqueConstraint("oib", name="uq_oib"),)
    supplier_id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_name = Column(String(255), nullable=False)
    oib = Column(String(11), nullable=False, unique=True)
    supplier_address = Column(String(255), nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Partner(Base):
    __tablename__ = "partneri"
    id = Column(Integer, primary_key=True, index=True)
    naziv = Column(String(255), nullable=False)
    oib = Column(String(20), nullable=False, unique=True, index=True)
    vat_id = Column(String(20), nullable=True)  # <--- dodano za EU VAT ID
    adresa = Column(String(255), nullable=True)
    kontakt_telefon = Column(String(50), nullable=True)
    kontakt_email = Column(String(100), nullable=True)
    kontakt_osoba = Column(String(100), nullable=True)
    vies_response = Column(JSON, nullable=True)

class MailAccount(Base):
    __tablename__ = "mail_accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    provider = Column(String(50), nullable=True)
    imap_server = Column(String(255), nullable=False)
    imap_port = Column(Integer, nullable=False)
    use_ssl = Column(Boolean, default=True)
    username = Column(String(255), nullable=False)
    password_encrypted = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class MailProcessed(Base):
    __tablename__ = "mail_processed"
    id = Column(Integer, primary_key=True, index=True)
    mail_account_id = Column(Integer, ForeignKey("mail_accounts.id"), nullable=False)
    uid = Column(String(255), nullable=True, index=True)  # može ostati nullable ako želiš
    message_uid = Column(String(255), nullable=False, index=True)  # ovo mora biti NOT NULL i indeksirano
    processed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(String(50), nullable=False, default="processed")
    mail_account = relationship("MailAccount")