import os
import uuid
import json
import logging
import hashlib
import warnings
import re
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, Form
from sqlalchemy.orm import Session
from core.parsers.dispatcher import dispatch_parser
from core.database.connection import SessionMain
from core.database.models import Document, Partner, DocumentAnnotation
from core.parsers.supplier_extractor import extract_supplier_info
from core.utils.regex_common import (
    extract_doc_number,
    extract_all_vats,
    extract_dates,
    extract_all_oibs,
    extract_invoice_date,
    extract_due_date,
    COUNTRY_VAT_REGEX,
)
from core.routes.oibvalidator import is_valid_oib
from core.deployment import get_owner_oib
from modules.ocr_processing.workers.engine import perform_ocr
from modules.sudreg_api.client import SudregClient
from core.vies_api.client import ViesClient
from elasticsearch import Elasticsearch
from PIL.Image import DecompressionBombWarning
from core.routes.settings import TRAINING_MODE_FLAG
from core.crud.settings import get_setting
import tempfile
import requests
import csv
import httpx
import asyncio

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

es = Elasticsearch(["http://localhost:9200"])
router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

CONFIG_PATH = os.path.join(BASE_DIR, "..", "utils", "regex_config.json")

sudreg_client = SudregClient()
vies_client = ViesClient()

def serialize_for_json(obj):
    from modules.sudreg_api.schemas import SudregCompany
    if isinstance(obj, SudregCompany):
        return obj.dict()
    if hasattr(obj, "dict"):
        return obj.dict()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

def str_to_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%d.%m.%Y").date()
    except Exception as e:
        logger.error(f"Error parsing date '{date_str}': {e}")
        return None

def date_to_str(date_obj):
    return date_obj.strftime("%d.%m.%Y") if date_obj else None

def format_address(address_obj):
    if not address_obj:
        return None
    parts = []
    if hasattr(address_obj, "ulica_i_broj") and address_obj.ulica_i_broj:
        parts.append(address_obj.ulica_i_broj)
    if hasattr(address_obj, "postanski_broj") and address_obj.postanski_broj:
        parts.append(str(address_obj.postanski_broj))
    if hasattr(address_obj, "mjesto") and address_obj.mjesto:
        parts.append(address_obj.mjesto)
    return ", ".join(parts)

def index_to_elasticsearch(doc):
    try:
        es.index(
            index="spineict_ocr",
            id=doc.id,
            document={
                "id": doc.id,
                "filename": doc.filename,
                "ocrresult": doc.ocrresult,
                "supplier_name_ocr": doc.supplier_name_ocr,
                "document_type": doc.document_type,
                "archived_at": str(doc.archived_at),
            }
        )
        logger.info(f"ES: Successfully indexed document ID: {doc.id}")
    except Exception as e:
        logger.error(f"ES: Indexing failed for document ID {doc.id}: {e}")

def build_auto_annotation_dict(
    document_type, oib, doc_number, invoice_date, due_date, parsed_data,
    skraceni_naziv, supplier_info
):
    return {
        "document_type": document_type,
        "oib": oib,
        "invoice_number": doc_number,
        "date_invoice": date_to_str(invoice_date),
        "date_valute": date_to_str(due_date),
        "amount": str(parsed_data.get("amount") or parsed_data.get("total") or parsed_data.get("iznos") or ""),
        "supplier_name": skraceni_naziv or supplier_info.get("naziv_firme") or "",
        "partner_name": supplier_info.get("naziv_firme") if document_type == "IRA" else "",
    }

def upsert_document_annotations(db, doc_id, annotation_dict):
    annotation = db.query(DocumentAnnotation).filter(DocumentAnnotation.document_id == doc_id).first()
    if not annotation:
        annotation = DocumentAnnotation(document_id=doc_id)
        db.add(annotation)

    for field, value in annotation_dict.items():
        if hasattr(annotation, field):
            setattr(annotation, field, value)
    annotation.annotations = json.dumps(annotation_dict, ensure_ascii=False)
    db.commit()
    logger.info(f"Annotations auto-filled for document ID {doc_id}")

def is_training_mode_enabled():
    return TRAINING_MODE_FLAG["enabled"]

def get_model_server_url(db):
    ip_setting = get_setting(db, "model_server_ip")
    port_setting = get_setting(db, "model_server_port")
    ip = ip_setting.value if ip_setting else "127.0.0.1"
    port = port_setting.value if port_setting else "9000"
    return f"http://{ip}:{port}"

async def call_ai_model_server(text: str, model_url: str) -> dict:
    payload = {"text": text}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{model_url}/classify", json=payload)
        resp.raise_for_status()
        return resp.json()

def load_regex_config():
    if not os.path.exists(CONFIG_PATH):
        logger.warning(f"Regex config file not found at {CONFIG_PATH}, using empty config.")
        return {}
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("regex", {})
    except Exception as e:
        logger.error(f"Error loading regex config: {e}")
        return {}

def normalize_amount(amount_str: str) -> float | None:
    if not amount_str:
        return None
    try:
        cleaned = amount_str.replace(".", "").replace(",", ".")
        return float(cleaned)
    except Exception as e:
        logger.warning(f"normalize_amount: cannot parse '{amount_str}': {e}")
        return None

@router.post("/documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    document_type: str = Form(...),
):
    logger.info(f"Starting upload process for {len(files)} files, document type: '{document_type}'")
    results = []
    db = SessionMain()

    regex_config = load_regex_config()

    try:
        owner_oib = get_owner_oib(db)
        owner_vat = f"HR{owner_oib}" if owner_oib else None
        logger.info(f"Owner OIB: {owner_oib}, Owner VAT: {owner_vat}")

        model_server_url = get_model_server_url(db)

        for file in files:
            logger.info(f"Processing file: {file.filename}")
            ext = os.path.splitext(file.filename)[1]

            hasher = hashlib.sha256()
            content_bytes = b""
            while True:
                chunk = await file.read(1024*1024)
                if not chunk:
                    break
                hasher.update(chunk)
                content_bytes += chunk
            file_hash = hasher.hexdigest()
            logger.info(f"File hash {file.filename}: {file_hash}")

            existing_doc = db.query(Document).filter_by(hash=file_hash).first()
            if existing_doc:
                logger.warning(f"Duplicate document found: {file.filename} (hash: {file_hash}) - skipping")
                results.append({
                    "filename": file.filename,
                    "status": "DUPLICATE",
                    "existing_id": existing_doc.id,
                    "message": "Document with same content already exists."
                })
                continue

            unique_name = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)

            try:
                with open(file_path, "wb") as f:
                    f.write(content_bytes)
                logger.info(f"File saved as {unique_name}")
            except Exception as e:
                logger.error(f"Error saving file {file.filename}: {e}")
                results.append({"filename": file.filename, "status": "FAILED", "error": str(e)})
                continue

            upload_time = datetime.utcnow()

            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", DecompressionBombWarning)
                    text = perform_ocr(file_path)
                logger.info(f"OCR successful for {unique_name}")
            except DecompressionBombWarning as bomb_warn:
                logger.warning(f"Skipping file {file.filename} due to image size warning: {bomb_warn}")
                results.append({"filename": file.filename, "status": "FAILED", "error": "Image too large (DecompressionBombWarning)"})
                continue
            except Exception as e:
                logger.error(f"OCR error for {file.filename}: {e}")
                results.append({"filename": file.filename, "status": "FAILED", "error": f"OCR error: {str(e)}"})
                continue

            # --- Poziv AI modela za klasifikaciju (novi dio) ---
            ai_classify_result = {}
            try:
                ai_classify_result = await call_ai_model_server(text, model_server_url)
                logger.info(f"AI classification result: {ai_classify_result}")
            except Exception as e:
                logger.warning(f"AI classification failed: {e}")

            ai_parsed = ai_classify_result.get("parsed_fields", {})
            ai_label = ai_classify_result.get("best_label", None)

            # --- Regex za OIB prvo ---
            oib_regex_candidates = [x for x in extract_all_oibs(text) if is_valid_oib(x) and x != owner_oib]
            oib = oib_regex_candidates[0] if oib_regex_candidates else None

            # Ako regex nije našao OIB, uzmi iz AI, ali ignoriraj domaći
            if not oib:
                oib_ai = ai_parsed.get("oib")
                if oib_ai == owner_oib:
                    oib_ai = None
                oib = oib_ai

            # --- Invoice number prvo iz AI, fallback regex ---
            doc_number = ai_parsed.get("invoice_number")
            if not doc_number:
                patterns = regex_config.get("doc_number_patterns", [])
                doc_number = None
                for p in patterns:
                    match = None
                    try:
                        match = re.search(p, text, re.IGNORECASE)
                    except Exception:
                        continue
                    if match:
                        group_index = 2 if match.lastindex and match.lastindex >= 2 else 0
                        doc_number = match.group(group_index).strip()
                        break

            invoice_date_str = ai_parsed.get("date_issued") or extract_invoice_date(text)
            due_date_str = ai_parsed.get("due_date") or extract_due_date(text)
            invoice_date = str_to_date(invoice_date_str)
            due_date = str_to_date(due_date_str)

            vat_ai = ai_parsed.get("vat_number")
            if vat_ai:
                vat_number = vat_ai
            else:
                all_vats = extract_all_vats(text)
                filtered_vats = [x for x in all_vats if owner_vat is None or x.upper() != owner_vat.upper()]
                if not filtered_vats and owner_vat and owner_vat in all_vats:
                    filtered_vats = [owner_vat]
                vat_number = filtered_vats[0] if filtered_vats else None

            final_document_type = ai_label if ai_label else document_type
            if final_document_type == "email-prilog":
                final_document_type = "OSTALO"

            try:
                parser_func = dispatch_parser(final_document_type)
                regex_parsed_data = parser_func(text)
            except Exception as e:
                logger.warning(f"Regex parsing failed for {file.filename}: {e}")
                regex_parsed_data = {}

            parsed_data = {**regex_parsed_data, **{k: v for k, v in ai_parsed.items() if v is not None}}

            # Izvući amount za bazu i normalizirati
            amount_value = None
            for key in ("amount", "amount_total", "iznos", "total"):
                if key in parsed_data and parsed_data[key]:
                    amount_value = normalize_amount(parsed_data[key])
                    if amount_value is not None:
                        break

            supplier_info = extract_supplier_info(text)
            skraceni_naziv = None
            partner_obj = None
            sudreg_data = None
            sudreg_raw = None
            vies_data = None

            if not oib and not vat_number:
                logger.warning(f"No OIB or VAT for document {file.filename}, using 'Nepoznat dobavljač'")
                skraceni_naziv = "Nepoznat dobavljač"
            else:
                if oib:
                    partner_obj = db.query(Partner).filter_by(oib=oib).first()
                    if partner_obj or oib != owner_oib:
                        if partner_obj:
                            logger.info(f"Partner found in DB: {partner_obj.naziv} ({partner_obj.oib})")
                            supplier_info.update({
                                "naziv_firme": partner_obj.naziv,
                                "adresa": partner_obj.adresa,
                                "oib": partner_obj.oib,
                            })
                            skraceni_naziv = partner_obj.naziv

                            if not getattr(partner_obj, "vies_response", None):
                                try:
                                    country_code = oib[:2]
                                    vat = oib[2:]
                                    vies_data = vies_client.validate_vat(country_code, vat)
                                    partner_obj.vies_response = vies_data
                                    db.commit()
                                    logger.info(f"VIES data saved for partner {oib}")
                                except Exception as e:
                                    logger.warning(f"VIES validation failed for OIB {oib}: {e}")
                            else:
                                vies_data = partner_obj.vies_response
                        else:
                            if oib != owner_oib:
                                try:
                                    sudreg_data, sudreg_raw = sudreg_client.get_company_by_oib(oib, db)
                                    if sudreg_data:
                                        partner_naziv = sudreg_raw.get("skracene_tvrtke", [{}])[0].get("ime") if sudreg_raw else sudreg_data.naziv
                                        supplier_info.update({
                                            "naziv_firme": partner_naziv,
                                            "adresa": format_address(sudreg_data.adresa),
                                            "oib": sudreg_data.oib,
                                        })
                                        novi_partner = Partner(
                                            naziv=partner_naziv,
                                            oib=sudreg_data.oib,
                                            adresa=format_address(sudreg_data.adresa),
                                            kontakt_email=None,
                                            kontakt_osoba=None,
                                            kontakt_telefon=None,
                                            vies_response=None,
                                        )
                                        db.add(novi_partner)
                                        db.commit()
                                        logger.info(f"Added new partner: {novi_partner.naziv} ({novi_partner.oib})")

                                        try:
                                            country_code = oib[:2]
                                            vat = oib[2:]
                                            vies_data = vies_client.validate_vat(country_code, vat)
                                            novi_partner.vies_response = vies_data
                                            db.commit()
                                            logger.info(f"VIES data saved for new partner {oib}")
                                        except Exception as e:
                                            logger.warning(f"VIES validation failed for OIB {oib}: {e}")

                                except Exception as e:
                                    sudreg_raw = {"error": str(e)}
                                    supplier_info["alert"] = f"❗ Sudreg API error: {e}"
                                    logger.warning(f"Error fetching Sudreg data for OIB {oib}: {e}")

                else:
                    if vat_number:
                        try:
                            country_code = vat_number[:2]
                            vat = vat_number[2:]
                            vies_data = vies_client.call_vies_soap_api(country_code, vat)
                            if vies_data.get("valid") and vies_data.get("name"):
                                supplier_info.update({
                                    "naziv_firme": vies_data.get("name"),
                                    "adresa": vies_data.get("address"),
                                })
                                skraceni_naziv = vies_data.get("name")

                                partner_obj = db.query(Partner).filter_by(oib=vat_number).first()
                                if not partner_obj:
                                    partner_obj = Partner(
                                        naziv=vies_data.get("name"),
                                        oib=vat_number,
                                        adresa=vies_data.get("address"),
                                        kontakt_email=None,
                                        kontakt_osoba=None,
                                        kontakt_telefon=None,
                                        vies_response=vies_data,
                                    )
                                    db.add(partner_obj)
                                    try:
                                        db.commit()
                                        logger.info(f"Added new EU partner from VIES data: {partner_obj.naziv} ({partner_obj.oib})")
                                    except Exception as e:
                                        db.rollback()
                                        logger.error(f"Error saving EU partner to DB: {e}")
                                else:
                                    logger.info(f"EU partner already exists in DB: {partner_obj.naziv} ({partner_obj.oib})")
                            else:
                                ai_supplier_name = ai_parsed.get("supplier_name")
                                if ai_supplier_name:
                                    skraceni_naziv = ai_supplier_name
                                else:
                                    skraceni_naziv = "Strani dobavljač"
                                supplier_info.update({"naziv_firme": skraceni_naziv})

                        except Exception as e:
                            logger.warning(f"VIES validation failed for VAT number {vat_number}: {e}")
                            ai_supplier_name = ai_parsed.get("supplier_name")
                            if ai_supplier_name:
                                skraceni_naziv = ai_supplier_name
                            else:
                                skraceni_naziv = "Strani dobavljač"
                            supplier_info.update({"naziv_firme": skraceni_naziv})

            doc = Document(
                filename=unique_name,
                ocrresult=text,
                supplier_id=None,
                supplier_name_ocr=skraceni_naziv or supplier_info.get("naziv_firme") or "Nepoznat dobavljač",
                supplier_oib=oib,
                archived_at=upload_time,
                date=upload_time,
                document_type=final_document_type,
                invoice_date=invoice_date,
                due_date=due_date,
                doc_number=doc_number,
                amount=amount_value,  # <-- ispravno float amount
                hash=file_hash,
                sudreg_response=json.dumps(sudreg_raw, ensure_ascii=False, default=serialize_for_json) if sudreg_raw else None,
                parsed=json.dumps(parsed_data, ensure_ascii=False, default=serialize_for_json),
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(f"Document saved with ID: {doc.id} and filename: {doc.filename}")

            annotation_dict = build_auto_annotation_dict(
                final_document_type, oib, doc_number, invoice_date, due_date, parsed_data,
                skraceni_naziv, supplier_info
            )
            upsert_document_annotations(db, doc.id, annotation_dict)

            index_to_elasticsearch(doc)

            try:
                new_filename = f"{doc.id}.pdf"
                new_path = os.path.join(UPLOAD_DIR, new_filename)
                os.rename(file_path, new_path)
                doc.filename = new_filename
                db.commit()
                logger.info(f"File renamed to {new_filename}")
            except Exception as e:
                logger.warning(f"File renaming failed: {e}")

            # --- Trening mod poslati samo nakon snimanja i anotacija ---
            if is_training_mode_enabled():
                try:
                    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".csv", encoding="utf-8", newline='') as tf:
                        writer = csv.writer(tf)
                        writer.writerow(["text", "label"])
                        writer.writerow([text, final_document_type])
                        tf.flush()
                        tf.seek(0)
                        with open(tf.name, "rb") as f:
                            files_data = {"file": (os.path.basename(tf.name), f, "text/csv")}
                            resp = requests.post(f"{model_server_url}/api/new_training_data", files=files_data, timeout=8)
                        os.unlink(tf.name)
                    if resp.ok:
                        logger.info(f"Trening sample poslan: {file.filename}")
                    else:
                        logger.warning(f"Trening sample NIJE poslan: {file.filename}: {resp.text}")
                except Exception as e:
                    logger.error(f"Greška pri slanju trening sample-a: {e}")

            results.append({
                "id": doc.id,
                "filename": doc.filename,
                "original_filename": file.filename,
                "status": "OK",
                "supplier": supplier_info,
                "document_type": final_document_type,
                "parsed": parsed_data,
            })

        if not results:
            logger.info("Upload process finished, no documents processed because owner license recognized.")
            return {"processed": [], "message": "No documents processed because owner license recognized."}

    except Exception as e:
        logger.error(f"Unexpected error during upload: {e}")
        return {"error": str(e)}
    finally:
        db.close()

    return {"processed": results}
