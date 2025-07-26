from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
import json

router = APIRouter()

METRICS_FILE = "/tmp/training_batches/last_training_metrics.json"  # putanja prema tvojoj konfiguraciji

@router.get("/ml/metrics")
async def get_ml_metrics():
    if os.path.exists(METRICS_FILE):
        with open(METRICS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    return JSONResponse(content={"error": "Metrike nisu dostupne"}, status_code=404)
