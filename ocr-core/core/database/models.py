from sqlalchemy import JSON, Column, Integer, String, ForeignKey, TIMESTAMP, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    oib = Column(String(20), nullable=False)
    db_name = Column(String(255), nullable=False, unique=True)
    licenses = Column(Integer, default=1)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    ocrresult = Column(Text)
    supplier_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    supplier_name_ocr = Column(String(255), nullable=True)  # NOVO polje za naziv dobavljača iz OCR-a
    date = Column(TIMESTAMP, nullable=True)
    amount = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relacija prema Client modelu
    supplier = relationship("Client", backref="documents")

    # Relacija prema anotacijama
    annotation = relationship("DocumentAnnotation", back_populates="document", uselist=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255))
    role = Column(String(50), default="user")
    created_at = Column(TIMESTAMP, server_default=func.now())

class DocumentAnnotation(Base):
    __tablename__ = "document_annotations"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True, index=True, nullable=False)
    annotations = Column(JSON, nullable=False)  # JSON polje za označene podatke

    document = relationship("Document", back_populates="annotation")
