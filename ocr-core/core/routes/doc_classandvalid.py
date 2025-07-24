from fastapi import APIRouter, WebSocket
from sqlalchemy.orm import Session
from core.database.connection import SessionMain
from core.database.models import Document, Client
import httpx
import asyncio
import logging
from collections import Counter
import re

router = APIRouter()
logger = logging.getLogger(__name__)

REMOTE_MODEL_URL = "http://192.168.100.53:9000/classify"
LABELS = ["IZVOD", "UGOVOR", "URA", "IRA", "OSTALO"]
BATCH_SIZE = 100
HEURISTIKA_URA_IRA_THRESHOLD = 0.07
TOP_N = 10

def build_label_examples(moja_firma, moj_oib):
    return {
        "IZVOD": ["Izvadak", "Izvod", "Bankovni izvod"],
        "UGOVOR": ["Ugovor o radu", "Ugovor o najmu poslovnog prostora", "Ugovor između dviju strana", "ugovor"],
        "URA": [
            "Primljeni račun od dobavljača",
            "Iznos za plaćanje po ulaznom računu",
            "Dobavljač: Konzum d.d.",
            "Datum zaprimanja računa",
            f"Račun broj 0001, primatelj: {moja_firma}",
            f"OIB primatelja: {moj_oib}",
            "kupac:{moja_firma}",
            "naručitelj:"
        ],
        "IRA": [
            "Izdani račun za kupca",
            "Prodaja usluge, kupac: ABC d.o.o.",
            "Račun izdan kupcu",
            "Datum izdavanja računa",
            f"Pošiljatelj: {moja_firma}",
            f"OIB pošiljatelja: {moj_oib}"
        ],
        "OSTALO": ["Ostali dokumenti", "Neprepoznati ili nedefinirani dokument", "Opći poslovni dokument"]
    }

def heuristika_ura_ira(text, moja_firma, moj_oib):
    text_lower = text.lower()
    linije = text_lower.splitlines()
    for linija in linije:
        if moja_firma.lower() in linija or moj_oib in linija:
            if "kupac" in linija or "primatelj" in linija:
                return "URA"
            if "prodavatelj" in linija or "pošiljatelj" in linija:
                return "IRA"
    return None

def heuristika_pozicija_firme(text, moja_firma, moj_oib, top_n=10):
    linije = text.splitlines()
    for i, linija in enumerate(linije):
        if moja_firma.lower() in linija.lower() or moj_oib in linija:
            if i < top_n:
                return "IRA"
            else:
                return "URA"
    return None

def sadrzi_rijec_ugovor(text):
    pattern = re.compile(r"\bugovor\w*\b", re.IGNORECASE)
    return bool(pattern.search(text))

@router.websocket("/ws/validate-progress")
async def websocket_validate_progress(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected, počinjemo obradu.")
    await websocket.send_text("WebSocket connected, počinjemo obradu.")

    db: Session = SessionMain()
    client = httpx.AsyncClient()
    try:
        client_row = db.query(Client).first()
        moja_firma = client_row.naziv_firme if client_row else ""
        moj_oib = client_row.oib if client_row else ""

        label_examples = build_label_examples(moja_firma, moj_oib)

        documents = db.query(Document).all()
        total = len(documents)
        count_validated = 0

        await websocket.send_text(f"Validacija i klasifikacija pokrenuta. Ukupno dokumenata: {total}")

        total_labels = []

        for i in range(0, total, BATCH_SIZE):
            batch = documents[i:i+BATCH_SIZE]
            batch_labels = []

            for doc in batch:
                text_to_classify = doc.ocrresult or ""

                if sadrzi_rijec_ugovor(text_to_classify):
                    top_label = "UGOVOR"
                else:
                    payload = {
                        "text": text_to_classify,
                        "labels": LABELS,
                        "label_examples": label_examples
                    }

                    resp = await client.post(REMOTE_MODEL_URL, json=payload)
                    result = resp.json()

                    label_scores = result.get("label_scores", {})
                    ura_score = label_scores.get("URA", 0)
                    ira_score = label_scores.get("IRA", 0)

                    top_label = result.get("best_label", "OSTALO")
                    if top_label in ["URA", "IRA"] and abs(ura_score - ira_score) < HEURISTIKA_URA_IRA_THRESHOLD:
                        poz_heur = heuristika_pozicija_firme(text_to_classify, moja_firma, moj_oib, top_n=TOP_N)
                        if poz_heur:
                            top_label = poz_heur
                        else:
                            heuristika = heuristika_ura_ira(text_to_classify, moja_firma, moj_oib)
                            if heuristika:
                                top_label = heuristika

                # Provjera domaćeg OIB-a za određene vrste, flag za izbacivanje
                if top_label in ["URA", "IRA", "UGOVOR"]:
                    if moja_firma.lower() not in text_to_classify.lower() and moj_oib not in text_to_classify:
                        top_label = "NEPOZNATO"
                        doc.predlozi_izbacivanje = True
                        await websocket.send_text(f"Dokument ID {doc.id} predložen za izbacivanje - nema domaći OIB.")
                    else:
                        doc.predlozi_izbacivanje = False
                else:
                    doc.predlozi_izbacivanje = False

                doc.document_type = top_label
                batch_labels.append(top_label)
                total_labels.append(top_label)
                count_validated += 1
                logger.info(f"Doc ID {doc.id} klasificiran kao {top_label}")

                # Pošalji najnoviji log na vrh
                await websocket.send_text(f"[{count_validated}/{total}] Dokument ID {doc.id} klasificiran kao {top_label}")

                await asyncio.sleep(0.01)

            db.commit()

            counter = Counter(batch_labels)
            stats_msg = "Statistika batcha: " + ", ".join(f"{k}: {v}" for k, v in counter.items())
            await websocket.send_text(stats_msg)

        total_counter = Counter(total_labels)
        total_stats_msg = "Ukupna statistika: " + ", ".join(f"{k}: {v}" for k, v in total_counter.items())
        await websocket.send_text(total_stats_msg)

        await websocket.send_text(f"Validacija i klasifikacija završena. Ukupno obrađeno: {count_validated} dokumenata.")
        await websocket.close()

    except Exception as e:
        logger.error(f"Greška u validaciji i klasifikaciji: {e}")
        await websocket.send_text(f"Greška: {e}")
        await websocket.close()
    finally:
        await client.aclose()
        db.close()
