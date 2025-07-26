import os
import json
import logging
import httpx
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()
logger = logging.getLogger(__name__)

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "utils", "regex_config.json")
INFERENCE_SERVER_URL = "http://192.168.100.53:9000"  # inference server IP i port

def read_config():
    if not os.path.isfile(CONFIG_PATH):
        return {"regex": ""}
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading config: {e}")

def write_config(data: dict):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving config: {e}")

@router.get("/regex-config")
async def get_regex_config():
    return read_config()

@router.post("/regex-config")
async def save_regex_config(request: Request):
    data = await request.json()
    if "regex" not in data:
        raise HTTPException(status_code=400, detail="Missing 'regex' field")
    
    write_config({"regex": data["regex"]})
    logger.info("Regex config saved locally.")

    # Sinkronizacija na inference server
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{INFERENCE_SERVER_URL}/api/regex-config", json={"regex": data["regex"]})
            resp.raise_for_status()
        logger.info("Regex config synced to inference server.")
    except Exception as e:
        logger.error(f"Failed to sync regex config to inference server: {e}")
        # Vrati warning, ali ne prekidaj
        return {"warning": f"Saved locally but failed to sync inference server: {e}"}

    return {"message": "Regex configuration saved successfully and synced to inference server."}
