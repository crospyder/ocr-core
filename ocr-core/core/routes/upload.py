import os
import uuid
import json
import logging
import re
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session
from core.parsers.dispatcher import dispatch_parser
from core.database.connection import SessionMain
from core.database.models import Document, Client, Partner
from core.parsers.supplier_extractor import extract_supplier_info
from modules.sudreg_api.client import SudregClient
from modules.ocr_processing.workers.engine import perform_ocr
from core.deployment import get_owner_oib

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

sudreg_client = SudregClient()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

def str_to_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception as e:
        logger.error(f"Greška pri parsiranju datuma '{date_str}': {e}")
        return None

def slugify(text):
    return re.sub(r"[^a-zA-Z0-9]+", "", text.lower())

@router.post("/documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    document_type: str = Form(...)
):
    logger.info(f"Početak upload procesa za {len(files)} datoteka, tip dokumenta: '{document_type}'")
    results = []
    db = SessionMain()

    owner_oib = get_owner_oib(db)

    for file in files:
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            results.append({"filename": file.filename, "status": "FAILED", "error": str(e)})
            continue

        upload_time = datetime.utcnow()

        try:
            text = perform_ocr(file_path)
        except Exception as e:
            results.append({"filename": file.filename, "status": "FAILED", "error": f"OCR error: {str(e)}"})
            continue

        try:
            parser_func = dispatch_parser(document_type)
            parsed_data = parser_func(text)
        except Exception as e:
            parsed_data = {"parser_error": str(e)}

        supplier_info = extract_supplier_info(text)
        oib = supplier_info.get("oib")
        partner_obj = None

        sudreg_data = None
        sudreg_raw = None
        skraceni_naziv = None

        if oib and oib != owner_oib:
            partner_obj = db.query(Partner).filter_by(oib=oib).first()

            if partner_obj:
                logger.info(f"Partner postoji u bazi: {partner_obj.naziv} ({partner_obj.oib})")
                supplier_info.update({
                    "naziv_firme": partner_obj.naziv,
                    "adresa": partner_obj.adresa,
                    "oib": partner_obj.oib,
                })
                skraceni_naziv = partner_obj.naziv
            else:
                try:
                    sudreg_data, sudreg_raw = sudreg_client.get_company_by_oib(oib, db)
                    if sudreg_data:
                        if sudreg_raw and isinstance(sudreg_raw, dict):
                            skracene_tvrtke = sudreg_raw.get("skracene_tvrtke")
                            if skracene_tvrtke and isinstance(skracene_tvrtke, list):
                                skraceni_naziv = skracene_tvrtke[0].get("ime")

                        partner_naziv = skraceni_naziv or sudreg_data.naziv

                        supplier_info.update({
                            "naziv_firme": partner_naziv,
                            "adresa": sudreg_data.adresa,
                            "oib": sudreg_data.oib,
                        })

                        # Upis novog partnera
                        novi_partner = Partner(
                            naziv=partner_naziv,
                            oib=sudreg_data.oib,
                            adresa=sudreg_data.adresa,
                            kontakt_email=None,
                            kontakt_osoba=None,
                            kontakt_telefon=None,
                        )
                        db.add(novi_partner)
                        db.commit()
                        logger.info(f"Dodan novi partner: {novi_partner.naziv} ({novi_partner.oib})")
                except Exception as e:
                    sudreg_raw = {"error": str(e)}
                    supplier_info["alert"] = f"❌ Greška u Sudreg API-ju: {e}"
        else:
            supplier_info["alert"] = "❌ OIB nije pronađen ili je domaći OIB"
            logger.warning("Nepotpun dokument - OIB nepoznat ili domaći")

        if isinstance(parsed_data, dict):
            safe_parsed = {
                k: v.dict() if isinstance(v, BaseModel) else v
                for k, v in parsed_data.items()
            }
        elif isinstance(parsed_data, BaseModel):
            safe_parsed = parsed_data.dict()
        else:
            safe_parsed = parsed_data

        invoice_date = str_to_date(safe_parsed.get("invoice_date"))
        due_date = str_to_date(safe_parsed.get("due_date"))
        if due_date is None and invoice_date is not None:
            due_date = invoice_date

        try:
            doc = Document(
                filename=unique_name,
                ocrresult=text,
                supplier_id=None,
                supplier_name_ocr=skraceni_naziv or supplier_info.get("naziv_firme") or "Nepoznat dobavljač",
                supplier_oib=oib,
                archived_at=upload_time,
                date=upload_time,
                document_type=document_type,
                invoice_date=invoice_date,
                due_date=due_date,
                sudreg_response=json.dumps(sudreg_raw, ensure_ascii=False) if sudreg_raw else None,
                parsed=json.dumps(safe_parsed, ensure_ascii=False),
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            is_nepotpun = not oib or (oib == owner_oib)
            naziv_slug = slugify(skraceni_naziv or supplier_info.get("naziv_firme") or "nepoznato")
            if is_nepotpun:
                naziv_slug = "nepotpundokument"
                doc.supplier_name_ocr = "Nepoznat dobavljač"

            broj = f"{doc.id:05d}"
            new_filename = f"{naziv_slug}-{document_type.lower()}-{broj}.pdf"
            new_path = os.path.join(UPLOAD_DIR, new_filename)

            try:
                os.rename(file_path, new_path)
                doc.filename = new_filename
                db.commit()
            except Exception as e:
                logger.warning(f"Preimenovanje nije uspjelo: {e}")

        except Exception as e:
            db.rollback()
            results.append({"filename": file.filename, "status": "FAILED", "error": f"DB error: {str(e)}"})
            continue

        results.append({
            "id": doc.id,
            "filename": doc.filename,
            "original_filename": file.filename,
            "status": "OK",
            "supplier": supplier_info,
            "sudreg_data": sudreg_data.dict() if sudreg_data else None,
            "document_type": document_type,
            "parsed": safe_parsed,
        })

    db.close()
    return {"processed": results}
