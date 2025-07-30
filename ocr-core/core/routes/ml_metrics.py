from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os
import json

router = APIRouter()

LAST_METRICS_FILE = "/tmp/training_batches/last_training_metrics.json"
HISTORY_METRICS_FILE = "/tmp/training_batches/training_metrics_history.jsonl"

@router.get("/ml/metrics")
async def get_ml_metrics():
    if os.path.exists(LAST_METRICS_FILE):
        with open(LAST_METRICS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    return JSONResponse(content={"error": "Metrike nisu dostupne"}, status_code=404)

@router.get("/ml/metrics/history")
async def get_ml_metrics_history():
    if not os.path.exists(HISTORY_METRICS_FILE):
        return JSONResponse(content=[])
    with open(HISTORY_METRICS_FILE, "r", encoding="utf-8") as f:
        data = [json.loads(line) for line in f if line.strip()]
    return JSONResponse(content=data)

def save_metrics(metrics: dict):
    """
    Pozovi ovu funkciju nakon treniranja modela.
    Snima trenutačne metrike i dodaje u povijest.
    """
    os.makedirs(os.path.dirname(LAST_METRICS_FILE), exist_ok=True)
    with open(LAST_METRICS_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)
    with open(HISTORY_METRICS_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(metrics, ensure_ascii=False) + "\n")
