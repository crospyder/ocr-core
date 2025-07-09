from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from elasticsearch import Elasticsearch
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, text
from core.database.connection import engine_main
from core.database.models import Document  # Pretpostavljam da postoji model za dokumente
from core.init_app import load_module_routers
from core.routes.admin import router as admin_router
from core.routes.documents import router as documents_router
from core.routes.upload import router as upload_router
from core.routes.clients import router as clients_router
from core.routes.annotations import router as annotations_router
from core.routes import logs
from core.routes import client_info
from core.routes import partneri
from modules.ocr_processing.routes import upload as upload_module
from core.database.models import Base
from fastapi import Depends
from sqlalchemy.orm import sessionmaker

# Definiraj session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_main)

# Funkcija za povezivanje s bazom podataka
def get_db():
    db = SessionLocal()  # Stvaranje sesije
    try:
        yield db
    finally:
        db.close()  # Zatvori sesiju nakon što se završi

app = FastAPI()

# Konfiguracija Elasticsearch-a - dodaj hosts parametar
es = Elasticsearch(
    hosts=["http://localhost:9200"]  # Povezivanje s lokalnim Elasticsearch-om
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # po potrebi ograničiti
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve statičke datoteke (npr. version.json)
app.mount("/core", StaticFiles(directory="core"), name="core")

# Registracija core ruta
app.include_router(admin_router)
app.include_router(documents_router, prefix="/api/documents")
app.include_router(upload_router, prefix="/api/upload")
app.include_router(upload_module.router, prefix="/api/upload", tags=["upload"])
app.include_router(clients_router, prefix="/api/clients")
app.include_router(annotations_router, prefix="/api/annotations")
app.include_router(logs.router, prefix="/api/logs")
app.include_router(client_info.router, prefix="/api/client")
app.include_router(partneri.router, prefix="/api")

# Automatsko učitavanje modula iz /modules
load_module_routers(app)

# Startup: kreiraj bazu i foldere
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine_main)
    os.makedirs("./backend/data/uploads/batch", exist_ok=True)

# Root endpoint
@app.get("/")
def root():
    return {"message": "OCR sustav aktivan"}

# Startup: ispiši rute u konzolu
@app.on_event("startup")
def print_routes():
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            print(f"Ruta: {route.path} Metode: {route.methods}")
        elif hasattr(route, "path"):
            print(f"Ruta (mount): {route.path}")

# Pretraga dokumenata
@app.get("/api/search/")
def search_documents(query: str = Query(..., min_length=3), page: int = 1, size: int = 10, db_session: Session = Depends(get_db)):
    """
    Endpoint za pretragu dokumenata po OCR tekstu i sirovom PDF tekstu s paginacijom.
    Kombinirana pretraga iz baze podataka i Elasticsearch-a.
    """
    # Pretraga u bazi podataka
    db_results = search_in_database(query, db_session)

    # Pretraga u Elasticsearch-u
    es_results = search_in_elasticsearch(query, page, size)

    # Kombiniraj rezultate iz baze podataka i Elasticsearch-a
    combined_results = {
        "db_results": db_results,
        "es_results": es_results,
    }

    return combined_results

# Funkcija za pretragu u bazi podataka
def search_in_database(query: str, db_session: Session):
    query_str = f"""
    SELECT * FROM documents
    WHERE ocrresult LIKE :query
    OR supplier_name_ocr LIKE :query
    OR document_type LIKE :query
    """
    result = db_session.execute(text(query_str), {"query": f"%{query}%"})
    
    # Pretvori rezultat u listu dict objekata pomoću _mapping
    rows = [dict(row._mapping) for row in result.fetchall()]  # Ispravno konvertiranje u dict
    return rows

# Pretraga u Elasticsearch-u
def search_in_elasticsearch(query: str, page: int, size: int):
    res = es.search(index="documents", body={
        "query": {
            "multi_match": {
                "query": query,
                "fields": ["ocr_text", "raw_pdf_text"]
            }
        },
        "from": (page - 1) * size,  # offset za paginaciju
        "size": size
    })
    
    # Izdvajanje samo korisnih podataka (_source)
    hits = res['hits']['hits']
    return [hit['_source'] for hit in hits]
