from sqlalchemy import Column, Integer, String, DateTime, func
from core.database.connection import Base

class ClientCompany(Base):
    __tablename__ = 'client_companies'

    id = Column(Integer, primary_key=True, index=True)
    naziv_firme = Column(String(256), nullable=False)
    oib = Column(String(11), unique=True, nullable=False, index=True)
    adresa = Column(String(512), nullable=True)
    kontakt_osoba = Column(String(128), nullable=True)
    email = Column(String(128), nullable=True)
    telefon = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
