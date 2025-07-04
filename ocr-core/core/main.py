from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from core.init_app import load_module_routers
from core.routes.admin import router as admin_router
from core.routes.documents import router as documents_router
from core.routes.upload import router as upload_router
from core.routes.clients import router as clients_router
from modules.ocr_processing.routes import upload
from core.routes.annotations import router as annotations_router
from core.routes import logs
from core.database.models import Base
from core.database.connection import engine_main


app = FastAPI()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # prilagodi prema potrebi
    allow_methods=["*"],
    allow_headers=["*"]
)

# Registracija core ruta
app.include_router(admin_router)
app.include_router(documents_router, prefix="/api/documents")
app.include_router(upload_router, prefix="/api/upload")
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(clients_router, prefix="/api/clients")
app.include_router(annotations_router, prefix="/api/annotations")
app.include_router(logs.router, prefix="/api/logs")

# Automatsko učitavanje modula iz /modules
load_module_routers(app)

# Startup događaj: kreiranje baza i direktorija
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine_main)
    os.makedirs("./backend/data/uploads/batch", exist_ok=True)

# Root endpoint
@app.get("/")
def root():
    return {"message": "OCR sustav aktivan"}

# Startup događaj: ispis ruta u konzolu za debug
@app.on_event("startup")
def print_routes():
    for route in app.routes:
        print(f"Ruta: {route.path} Metode: {route.methods}")
