from fastapi import APIRouter, WebSocket
from sqlalchemy.orm import Session
from core.database.connection import SessionMain
from core.database.models import Document
import httpx
import asyncio
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

REMOTE_MODEL_URL = "http://192.168.100.53:9000/classify"  # IP i port inference servera
LABELS = ["IZVOD", "UGOVOR", "URA", "IRA", "OSTALO"]
BATCH_SIZE = 100  # batch po 100

@router.websocket("/ws/validate-progress")
async def websocket_validate_progress(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected, počinjemo obradu.")
    await websocket.send_text("WebSocket connected, počinjemo obradu.")

    db: Session = SessionMain()
    client = httpx.AsyncClient()
    try:
        documents = db.query(Document).all()
        total = len(documents)
        count_validated = 0

        await websocket.send_text(f"Validacija i klasifikacija pokrenuta. Ukupno dokumenata: {total}")

        for i in range(0, total, BATCH_SIZE):
            batch = documents[i:i+BATCH_SIZE]

            for doc in batch:
                text_to_classify = doc.ocrresult or ""
                payload = {
                    "text": text_to_classify,
                    "candidate_labels": LABELS
                }

                resp = await client.post(REMOTE_MODEL_URL, json=payload)
                result = resp.json()

                top_label = result.get("labels", ["OSTALO"])[0]
                doc.document_type = top_label
                count_validated += 1
                logger.info(f"Doc ID {doc.id} klasificiran kao {top_label}")

                # Pošalji update klijentu
                await websocket.send_text(f"Obrađeno {count_validated} od {total} dokumenata")
                await asyncio.sleep(0.01)  # mali delay da ne zatrpaš websocket

            # Commit na kraj batcha
            db.commit()

        await websocket.send_text(f"Validacija i klasifikacija završena. Ukupno obrađeno: {count_validated} dokumenata.")
        await websocket.close()

    except Exception as e:
        logger.error(f"Greška u validaciji i klasifikaciji: {e}")
        await websocket.send_text(f"Greška: {e}")
        await websocket.close()
    finally:
        await client.aclose()
        db.close()
