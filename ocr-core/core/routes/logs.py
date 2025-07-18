from fastapi import APIRouter, Request
import logging
import os

router = APIRouter()

@router.get("/logs")
def get_logs():
    try:
        # Pretpostavljam da si prešao na backend.log!
        log_path = os.path.join("logs", "backend.log")
        with open(log_path, "r") as f:
            lines = f.readlines()[-50:]  # zadnjih 50 linija
        return {"logs": lines}
    except Exception as e:
        return {"logs": [f"⚠️ Greška pri čitanju logova: {str(e)}"]}

# === OVO JE NOVO: endpoint za logiranje s frontenda ===
@router.post("/frontend-log")
async def frontend_log(request: Request):
    data = await request.json()
    message = data.get("message", "")
    level = data.get("level", "info").lower()
    extra = data.get("extra", "")

    log_message = f"[FRONTEND] {message} {extra}"
    if level == "info":
        logging.info(log_message)
    elif level == "warning":
        logging.warning(log_message)
    elif level == "error":
        logging.error(log_message)
    else:
        logging.debug(log_message)
    return {"status": "ok"}
