from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

# Zamijeni s tvojim PostgreSQL podacima: korisnik, lozinka, host, baza
DATABASE_URL = "postgresql+psycopg2://npausic:1234@localhost/SpineICT_OCR?options=-csearch_path=spineict_ocr"


engine_main = create_engine(
    DATABASE_URL,   # ovdje koristimo DATABASE_URL, a ne DATABASE_URL_MAIN
    pool_pre_ping=True,
    echo=False
)

SessionMain = sessionmaker(bind=engine_main)

def get_db():
    db = SessionMain()
    try:
        yield db
    finally:
        db.close()

Base = declarative_base()
