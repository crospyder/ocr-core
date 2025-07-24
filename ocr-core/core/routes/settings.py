from fastapi import APIRouter, Body

router = APIRouter()

# TEMP: u praksi bi ovo čitao iz baze/settings tablice ili ENV-a!
TRAINING_MODE_FLAG = {"enabled": False}

@router.get("/settings/training-mode")
def get_training_mode():
    return {"enabled": TRAINING_MODE_FLAG["enabled"]}

@router.patch("/settings/training-mode")
def set_training_mode(payload: dict = Body(...)):
    enabled = bool(payload.get("enabled", False))
    TRAINING_MODE_FLAG["enabled"] = enabled
    return {"enabled": enabled}
