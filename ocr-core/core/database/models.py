from sqlalchemy import JSON, Column, Integer, String, ForeignKey, TIMESTAMP, Text, func, UniqueConstraint, Date, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

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
    amount = Column(Numeric(12, 2), nullable=True)  # Decimalni iznos
    archived_at = Column(TIMESTAMP, server_default=func.now())
    supplier = relationship("Client", backref="documents")
    annotation = relationship("DocumentAnnotation", back_populates="document", uselist=False)
    sudreg_response = Column(Text, nullable=True)
    document_type = Column(String(50), nullable=True)  # dodana dužina
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    parsed = Column(JSON, nullable=True)  # Pohrana JSON direktno u bazu
    doc_number = Column(String(255), nullable=True)  # NOVI STUPAC: broj dokumenta

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)  # dodano nullable=True
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
    adresa = Column(String(255), nullable=True)  # dodano nullable=True
    kontakt_telefon = Column(String(50), nullable=True)  # dodano nullable=True
    kontakt_email = Column(String(100), nullable=True)  # dodano nullable=True
    kontakt_osoba = Column(String(100), nullable=True)  # dodano nullable=True
