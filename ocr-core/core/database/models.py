from sqlalchemy import JSON, Column, Integer, String, ForeignKey, TIMESTAMP, Text, func, UniqueConstraint, Date
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    oib = Column(String(20), nullable=False)
    db_name = Column(String(255), nullable=False, unique=True)
    licenses = Column(Integer, default=1)
    archived_at = Column(TIMESTAMP, server_default=func.now())
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    ocrresult = Column(Text)
    supplier_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    supplier_name_ocr = Column(String(255), nullable=True)
    supplier_oib = Column(String(11), nullable=True)
    date = Column(TIMESTAMP, nullable=True)
    amount = Column(Integer, nullable=True)
    archived_at = Column(TIMESTAMP, server_default=func.now())
    supplier = relationship("Client", backref="documents")
    annotation = relationship("DocumentAnnotation", back_populates="document", uselist=False)
    sudreg_response = Column(Text, nullable=True)
    document_type = Column(String, nullable=True)
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    parsed = Column(Text, nullable=True)  # Dodano polje za spremljene parsed podatke (JSON kao string)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255))
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
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
