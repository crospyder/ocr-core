from dotenv import load_dotenv
load_dotenv()

import logging
from logging.handlers import TimedRotatingFileHandler
import os
import sys
from core.routes import settings
from core.routes import ml_metrics
from fastapi import FastAPI, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import RequestValidationError
from elasticsearch import Elasticsearch
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database.connection import engine_main
from core.database.models import Document, Base
from core.init_app import load_module_routers
from core.database.session import get_db
from core.routes.admin import router as admin_router
from core.routes.documents import router as documents_router
from core.routes.upload import router as upload_router
from core.routes.clients import router as clients_router
from core.routes.annotations import router as annotations_router
from core.routes import logs, client_info, partneri, clients, mail_accounts, mail_processing
from modules.ocr_processing.routes import upload as upload_module
from modules.sudreg_manual import router as sudreg_manual_router
from core.routes.settings import router as settings_router
from core.billing import api as billing_api
from core.routes import regex_config
from core.routes import finances

 

LOG_DIR = "./logs"
os.makedirs(LOG_DIR, exist_ok=True)
log_file = os.path.join(LOG_DIR, "backend.log")

handler = TimedRotatingFileHandler(
    log_file, when="midnight", interval=1, backupCount=7, encoding="utf-8"
)
handler.suffix = "%Y-%m-%d"
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers = [handler, logging.StreamHandler(sys.stdout)]

for uvicorn_logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    uvicorn_logger = logging.getLogger(uvicorn_logger_name)
    uvicorn_logger.handlers = []
    uvicorn_logger.propagate = True

logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

app = FastAPI()

ES_INDEX = "spineict_ocr"
es = Elasticsearch(hosts=["http://localhost:9200"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/core", StaticFiles(directory="core"), name="core")

app.include_router(admin_router)
app.include_router(settings.router, prefix="/api")
app.include_router(documents_router, prefix="/api/documents")
app.include_router(upload_router, prefix="/api/upload")
app.include_router(upload_module.router, prefix="/api/upload", tags=["upload"])
app.include_router(annotations_router, prefix="/api/annotations")
app.include_router(logs.router, prefix="/api/logs")
app.include_router(client_info.router, prefix="/api/client")
app.include_router(partneri.router, prefix="/api")
app.include_router(clients.router, prefix="/api/client")
app.include_router(sudreg_manual_router, prefix="/api/tools", tags=["tools"])
app.include_router(mail_accounts.router, prefix="/api/mail_accounts")
app.include_router(mail_processing.router)  # router has prefix internally
app.include_router(billing_api.router, prefix="/billing", tags=["billing"])
app.include_router(ml_metrics.router)
app.include_router(regex_config.router, prefix="/api")
app.include_router(finances.router, prefix="/api")


load_module_routers(app)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine_main)
    os.makedirs("./backend/data/uploads/batch", exist_ok=True)

@app.get("/")
def root():
    logging.info("NEVEN JE POZVAO / endpoint!")
    return {"message": "OCR sustav aktivan"}

@app.on_event("startup")
def print_routes():
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            print(f"Ruta: {route.path} Metode: {route.methods}")
        elif hasattr(route, "path"):
            print(f"Ruta (mount): {route.path}")

@app.get("/api/search/")
def search_documents(
    query: str = Query(..., min_length=3),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db_session: Session = Depends(get_db),
):
    db_results = search_in_database(query, db_session, page, size)
    es_results = search_in_elasticsearch(query, page, size)
    return {"db_results": db_results, "es_results": es_results}

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
    result = db_session.execute(text(query_str), {"query": f"%{query}%", "limit": size, "offset": offset})
    rows = [dict(row._mapping) for row in result.fetchall()]
    return rows

def search_in_elasticsearch(query: str, page: int, size: int):
    res = es.search(
        index=ES_INDEX,
        body={
            "query": {"query_string": {"query": query, "fields": ["ocrresult", "filename", "supplier_name_ocr"], "default_operator": "AND"}},
            "from": (page - 1) * size,
            "size": size,
        },
    )
    hits = res["hits"]["hits"]
    return [hit["_source"] for hit in hits]

# Exception handler for validation errors to get detailed error messages on client side
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )
