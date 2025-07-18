from sqlalchemy.orm import sessionmaker
from core.database.connection import engine_main

# Kreiramo session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_main)

# Generator za dohvat sesije (koristi se kao dependency u FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
