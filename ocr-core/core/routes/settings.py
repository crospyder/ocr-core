from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from core.database.connection import get_db
from core.crud import settings as crud_settings

router = APIRouter()

# --- TRAINING MODE (privremeno memory, kasnije možeš prebaciti u settings tablicu) ---
TRAINING_MODE_FLAG = {"enabled": False}

@router.get("/settings/training-mode")
def get_training_mode():
    return {"enabled": TRAINING_MODE_FLAG["enabled"]}

@router.patch("/settings/training-mode")
def set_training_mode(payload: dict = Body(...)):
    enabled = bool(payload.get("enabled", False))
    TRAINING_MODE_FLAG["enabled"] = enabled
    return {"enabled": enabled}

# --- APP SETTINGS ---

@router.get("/settings", response_model=dict)
def get_settings(db: Session = Depends(get_db)):
    all_settings = crud_settings.get_all_settings(db)
    return {s.key: s.value for s in all_settings}

@router.post("/settings", response_model=dict)
def set_settings(settings: dict = Body(...), db: Session = Depends(get_db)):
    for key, value in settings.items():
        crud_settings.set_setting(db, key, value)
    return {"status": "ok"}
