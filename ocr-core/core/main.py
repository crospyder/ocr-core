from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from elasticsearch import Elasticsearch
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database.connection import engine_main
from core.database.models import Document
from core.init_app import load_module_routers
from core.routes.admin import router as admin_router
from core.routes.documents import router as documents_router
from core.routes.upload import router as upload_router
from core.routes.clients import router as clients_router
from core.routes.annotations import router as annotations_router
from core.routes import logs
from core.routes import client_info  # import za client_info router
from core.routes import partneri
from modules.ocr_processing.routes import upload as upload_module
from core.database.models import Base
from sqlalchemy.orm import sessionmaker
from core.routes import clients

# Definiraj session maker za bazu
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_main)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# Elasticsearch index
ES_INDEX = "spineict_ocr"
es = Elasticsearch(
    hosts=["http://localhost:9200"]
)

# Middleware za CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serviranje statičkih datoteka
app.mount("/core", StaticFiles(directory="core"), name="core")

# Registracija ruta
app.include_router(admin_router)
app.include_router(documents_router, prefix="/api/documents")
app.include_router(upload_router, prefix="/api/upload")
app.include_router(upload_module.router, prefix="/api/upload", tags=["upload"])
app.include_router(annotations_router, prefix="/api/annotations")
app.include_router(logs.router, prefix="/api/logs")
app.include_router(client_info.router, prefix="/api/client")  # Jedinstvena registracija
app.include_router(partneri.router, prefix="/api")
app.include_router(clients.router, prefix="/api/client")

# Automatsko učitavanje modula iz /modules
load_module_routers(app)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine_main)
    os.makedirs("./backend/data/uploads/batch", exist_ok=True)

@app.get("/")
def root():
    return {"message": "OCR sustav aktivan"}

@app.on_event("startup")
def print_routes():
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            print(f"Ruta: {route.path} Metode: {route.methods}")
        elif hasattr(route, "path"):
            print(f"Ruta (mount): {route.path}")

# Poboljšana pretraga dokumenata (baza + Elasticsearch)
@app.get("/api/search/")
def search_documents(
    query: str = Query(..., min_length=3),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db_session: Session = Depends(get_db)
):
    db_results = search_in_database(query, db_session, page, size)
    es_results = search_in_elasticsearch(query, page, size)
    return {
        "db_results": db_results,
        "es_results": es_results
    }

def search_in_database(query: str, db_session: Session, page: int = 1, size: int = 10):
    offset = (page - 1) * size
    query_str = """
    SELECT id, filename, ocrresult, supplier_name_ocr, document_type, archived_at
    FROM documents
    WHERE ocrresult ILIKE :query
    OR supplier_name_ocr ILIKE :query
    OR document_type ILIKE :query
    OR filename ILIKE :query
    ORDER BY archived_at DESC
    LIMIT :limit OFFSET :offset
    """
    result = db_session.execute(
        text(query_str),
        {"query": f"%{query}%", "limit": size, "offset": offset}
    )
    rows = [dict(row._mapping) for row in result.fetchall()]
    return rows

def search_in_elasticsearch(query: str, page: int, size: int):
    res = es.search(index=ES_INDEX, body={
        "query": {
            "query_string": {
                "query": query,
                "fields": ["ocrresult", "filename", "supplier_name_ocr"],
                "default_operator": "AND"
            }
        },
        "from": (page - 1) * size,
        "size": size
    })
    hits = res['hits']['hits']
    # Opcionalno: možeš mapirati podatke da budu konzistentni s bazom
    return [hit['_source'] for hit in hits]
