"""
Patched upload route for handling document uploads with improved type safety.

This version includes additional checks to avoid `'str' object has no attribute 'get'`
errors when dealing with responses from SudReg and VIES APIs or other data
structures that might sometimes be strings rather than dictionaries.
"""

import os
import uuid
import json
import logging
import hashlib
import warnings
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, UploadFile, File, Form
from sqlalchemy.orm import Session

from core.parsers.dispatcher import dispatch_parser
from core.database.connection import SessionMain
from core.database.models import Document, Partner, DocumentAnnotation
from core.parsers.supplier_extractor import extract_supplier_info
from core.utils.regex import extract_all_vats, extract_all_oibs, extract_invoice_date, extract_due_date
from core.routes.oibvalidator import is_valid_oib
from core.deployment import get_owner_oib
from modules.ocr_processing.workers.engine import perform_ocr
from modules.sudreg_api.client import SudregClient
from core.vies_api.client import ViesClient
from elasticsearch import Elasticsearch

# Mapping returned numeric labels from the AI model to human-readable document types.
# Adjust this mapping to match the classes used by your model server.  The keys should
# correspond to the string numbers returned in `best_label`, and the values are the
# corresponding document type names (e.g., "URA", "IRA", "OSTALO").
AI_LABEL_MAPPING: Dict[str, str] = {
    "0": "URA",
    "1": "IRA",
    "2": "OSTALO",
}

from PIL.Image import DecompressionBombWarning
from core.routes.settings import TRAINING_MODE_FLAG
import tempfile
import requests
import csv

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

es = Elasticsearch(["http://localhost:9200"])
router = APIRouter()

# Base directory and upload destination
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

sudreg_client = SudregClient()
vies_client = ViesClient()


def serialize_for_json(obj: Any) -> Any:
    """
    Ensure that complex objects (e.g., SudregCompany) are serializable for JSON dumps.
    """
    from modules.sudreg_api.schemas import SudregCompany
    if isinstance(obj, SudregCompany):
        return obj.dict()
    if hasattr(obj, "dict"):
        return obj.dict()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


def str_to_date(date_str: Optional[str]):
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


def index_to_elasticsearch(doc: Document):
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
            },
        )
        logger.info(f"ES: Successfully indexed document ID: {doc.id}")
    except Exception as e:
        logger.error(f"ES: Indexing failed for document ID {doc.id}: {e}")


def build_auto_annotation_dict(
    document_type: str,
    oib: Optional[str],
    doc_number: Optional[str],
    invoice_date,
    due_date,
    parsed_data: Dict[str, Any],
    skraceni_naziv: Optional[str],
    supplier_info: Any,
) -> Dict[str, Any]:
    """
    Build the annotation dictionary used for auto-filling document annotations.
    Includes checks on supplier_info to avoid attribute errors if supplier_info is a string.
    """
    supplier_name = skraceni_naziv or (
        supplier_info.get("naziv_firme") if isinstance(supplier_info, dict) else ""
    )
    partner_name = (
        supplier_info.get("naziv_firme") if document_type == "IRA" and isinstance(supplier_info, dict) else ""
    )
    return {
        "document_type": document_type,
        "oib": oib,
        "invoice_number": doc_number,
        "date_invoice": date_to_str(invoice_date),
        "date_valute": date_to_str(due_date),
        # fallback to various possible keys
        "amount_total": str(
            parsed_data.get("total")
            or parsed_data.get("iznos")
            or parsed_data.get("amount")
            or ""
        ),
        "supplier_name": supplier_name,
        "partner_name": partner_name,
    }


def upsert_document_annotations(db: Session, doc_id: int, annotation_dict: Dict[str, Any]) -> None:
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


def is_training_mode_enabled() -> bool:
    return TRAINING_MODE_FLAG.get("enabled", False)


@router.post("/documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    document_type: str = Form(...),
):
    logger.info(
        f"Starting upload process for {len(files)} files, document type: '{document_type}'"
    )
    results: List[Dict[str, Any]] = []
    db: Session = SessionMain()

    try:
        owner_oib = get_owner_oib(db)
        owner_vat = f"HR{owner_oib}" if owner_oib else None
        logger.info(f"Owner OIB: {owner_oib}, Owner VAT: {owner_vat}")

        for file in files:
            logger.info(f"Processing file: {file.filename}")
            ext = os.path.splitext(file.filename)[1]

            # Read entire file in chunks to calculate hash
            hasher = hashlib.sha256()
            content_bytes = b""
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                hasher.update(chunk)
                content_bytes += chunk
            file_hash = hasher.hexdigest()
            logger.info(f"File hash {file.filename}: {file_hash}")

            existing_doc = db.query(Document).filter_by(hash=file_hash).first()
            if existing_doc:
                logger.warning(
                    f"Duplicate document found: {file.filename} (hash: {file_hash}) - skipping"
                )
                results.append(
                    {
                        "filename": file.filename,
                        "status": "DUPLICATE",
                        "existing_id": existing_doc.id,
                        "message": "Document with same content already exists.",
                    }
                )
                continue

            # Save file temporarily under random name
            unique_name = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_name)

            try:
                with open(file_path, "wb") as f:
                    f.write(content_bytes)
                logger.info(f"File saved as {unique_name}")
            except Exception as e:
                logger.error(f"Error saving file {file.filename}: {e}")
                results.append(
                    {
                        "filename": file.filename,
                        "status": "FAILED",
                        "error": str(e),
                    }
                )
                continue

            upload_time = datetime.utcnow()

            # Perform OCR on the saved file
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", DecompressionBombWarning)
                    text = perform_ocr(file_path)
                logger.info(f"OCR successful for {unique_name}")
            except DecompressionBombWarning as bomb_warn:
                logger.warning(
                    f"Skipping file {file.filename} due to image size warning: {bomb_warn}"
                )
                results.append(
                    {
                        "filename": file.filename,
                        "status": "FAILED",
                        "error": "Image too large (DecompressionBombWarning)",
                    }
                )
                continue
            except Exception as e:
                logger.error(f"OCR error for {file.filename}: {e}")
                results.append(
                    {
                        "filename": file.filename,
                        "status": "FAILED",
                        "error": f"OCR error: {str(e)}",
                    }
                )
                continue

            # Call external AI model for classification and parsing
            ai_classify_result: Dict[str, Any] = {}
            try:
                # Build URL for model server from settings
                model_ip_setting = None
                model_port_setting = None
                try:
                    from core.crud.settings import get_setting
                    model_ip_setting = get_setting(db, "model_server_ip")
                    model_port_setting = get_setting(db, "model_server_port")
                except Exception:
                    pass
                model_ip = model_ip_setting.value if model_ip_setting else "127.0.0.1"
                model_port = model_port_setting.value if model_port_setting else "9000"
                model_server_url = f"http://{model_ip}:{model_port}"

                payload = {"text": text}
                resp = requests.post(
                    f"{model_server_url}/classify", json=payload, timeout=15
                )
                if resp.status_code == 200:
                    ai_classify_result = resp.json()
                logger.info(f"AI classification result: {ai_classify_result}")
            except Exception as e:
                logger.warning(f"AI classification failed: {e}")

            # Normalise classification response into parsed fields and label
            ai_parsed = (
                ai_classify_result.get("parsed_fields", {})
                if isinstance(ai_classify_result, dict)
                else {}
            )
            ai_label = (
                ai_classify_result.get("best_label")
                if isinstance(ai_classify_result, dict)
                else None
            )

            # Extract OIB using regex; if none found, fallback to AI
            oib_candidates = [
                x
                for x in extract_all_oibs(text)
                if is_valid_oib(x) and x != owner_oib
            ]
            oib = oib_candidates[0] if oib_candidates else None
            if not oib:
                oib_ai = ai_parsed.get("oib") if isinstance(ai_parsed, dict) else None
                if oib_ai == owner_oib:
                    oib_ai = None
                oib = oib_ai

            # Invoice number from AI; fallback to invoice number regex patterns
            doc_number = (
                ai_parsed.get("invoice_number") if isinstance(ai_parsed, dict) else None
            )
            # Attempt regex fallback using pattern definitions from utils/regex_config.json
            # (omitted here; can be reintroduced if needed)

            invoice_date_str = (
                ai_parsed.get("date_issued") if isinstance(ai_parsed, dict) else None
            ) or extract_invoice_date(text)
            due_date_str = (
                ai_parsed.get("due_date") if isinstance(ai_parsed, dict) else None
            ) or extract_due_date(text)
            invoice_date = str_to_date(invoice_date_str)
            due_date = str_to_date(due_date_str)

            # VAT detection
            vat_ai = (
                ai_parsed.get("vat_number") if isinstance(ai_parsed, dict) else None
            )
            if vat_ai:
                vat_number = vat_ai
            else:
                all_vats = extract_all_vats(text)
                filtered_vats = [
                    v
                    for v in all_vats
                    if owner_vat is None or v.upper() != owner_vat.upper()
                ]
                if not filtered_vats and owner_vat and owner_vat in all_vats:
                    filtered_vats = [owner_vat]
                vat_number = filtered_vats[0] if filtered_vats else None

            # Determine the final document type using AI_LABEL_MAPPING. If the AI returned
            # a numeric label, map it to the corresponding document type; otherwise
            # fall back to the provided document_type. Additionally, normalize any
            # special labels such as "email-prilog" to a known type ("OSTALO").
            if ai_label:
                final_document_type = AI_LABEL_MAPPING.get(ai_label, ai_label)
            else:
                final_document_type = document_type
            if final_document_type == "email-prilog":
                final_document_type = "OSTALO"

            # Combine regex and AI parsed data
            parsed_data: Dict[str, Any] = {}
            # AI fields override regex fields if present
            if isinstance(ai_parsed, dict):
                parsed_data.update(
                    {k: v for k, v in ai_parsed.items() if v is not None}
                )

            # Normalise amount
            amount_value: Optional[float] = None
            for key in ("amount", "total", "iznos", "amount_total"):
                if key in parsed_data and parsed_data[key]:
                    try:
                        cleaned = (
                            parsed_data[key].replace(".", "").replace(",", ".")
                        )
                        amount_value = float(cleaned)
                        break
                    except Exception:
                        pass

            # Extract supplier info using OCR text; ensure dictionary fallback
            supplier_info = extract_supplier_info(text)
            if not isinstance(supplier_info, dict):
                supplier_info = {}
            skraceni_naziv: Optional[str] = None
            partner_obj: Optional[Partner] = None
            sudreg_data = None
            sudreg_raw = None
            vies_data = None

            if not oib and not vat_number:
                # Unknown supplier
                skraceni_naziv = "Nepoznat dobavljač"
            else:
                # We have OIB or VAT; attempt to match existing partner or fetch from external services
                if oib:
                    partner_obj = db.query(Partner).filter_by(oib=oib).first()
                    if partner_obj or oib != owner_oib:
                        if partner_obj:
                            # Existing partner in DB
                            supplier_info.update(
                                {
                                    "naziv_firme": partner_obj.naziv,
                                    "adresa": partner_obj.adresa,
                                    "oib": partner_obj.oib,
                                }
                            )
                            skraceni_naziv = partner_obj.naziv
                            if not getattr(partner_obj, "vies_response", None):
                                try:
                                    country_code = oib[:2]
                                    vat = oib[2:]
                                    vies_data = vies_client.validate_vat(country_code, vat)
                                    partner_obj.vies_response = vies_data
                                    db.commit()
                                except Exception as e:
                                    logger.warning(f"VIES validation failed for OIB {oib}: {e}")
                            else:
                                vies_data = partner_obj.vies_response
                        else:
                            # No partner in DB; query Sudreg API
                            try:
                                sudreg_data, sudreg_raw = sudreg_client.get_company_by_oib(oib, db)
                                if sudreg_data:
                                    partner_name_from_sudreg = None
                                    if sudreg_raw and isinstance(sudreg_raw, dict):
                                        skracene_tvrtke = sudreg_raw.get("skracene_tvrtke", [{}])
                                        if (
                                            isinstance(skracene_tvrtke, list)
                                            and skracene_tvrtke
                                            and isinstance(skracene_tvrtke[0], dict)
                                        ):
                                            partner_name_from_sudreg = skracene_tvrtke[0].get("ime")
                                    partner_name_from_sudreg = (
                                        partner_name_from_sudreg
                                        if partner_name_from_sudreg
                                        else getattr(sudreg_data, "naziv", None)
                                    )
                                    supplier_info.update(
                                        {
                                            "naziv_firme": partner_name_from_sudreg,
                                            "adresa": format_address(sudreg_data.adresa),
                                            "oib": sudreg_data.oib,
                                        }
                                    )
                                    novi_partner = Partner(
                                        naziv=partner_name_from_sudreg,
                                        oib=sudreg_data.oib,
                                        adresa=format_address(sudreg_data.adresa),
                                        kontakt_email=None,
                                        kontakt_osoba=None,
                                        kontakt_telefon=None,
                                        vies_response=None,
                                    )
                                    db.add(novi_partner)
                                    db.commit()
                                    # Fetch VIES for new partner
                                    try:
                                        country_code = oib[:2]
                                        vat = oib[2:]
                                        vies_data = vies_client.validate_vat(country_code, vat)
                                        novi_partner.vies_response = vies_data
                                        db.commit()
                                    except Exception as e:
                                        logger.warning(f"VIES validation failed for OIB {oib}: {e}")
                            except Exception as e:
                                sudreg_raw = {"error": str(e)}
                                supplier_info["alert"] = f"❗ Sudreg API error: {e}"
                                logger.warning(
                                    f"Error fetching Sudreg data for OIB {oib}: {e}"
                                )
                else:
                    # Only VAT number available; call VIES
                    if vat_number:
                        try:
                            country_code = vat_number[:2]
                            vat = vat_number[2:]
                            vies_data = vies_client.call_vies_soap_api(country_code, vat)
                            # Only use if dict and valid
                            if (
                                isinstance(vies_data, dict)
                                and vies_data.get("valid")
                                and vies_data.get("name")
                            ):
                                supplier_info.update(
                                    {
                                        "naziv_firme": vies_data.get("name"),
                                        "adresa": vies_data.get("address"),
                                    }
                                )
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
                                    except Exception:
                                        db.rollback()
                                else:
                                    # partner already exists
                                    pass
                            else:
                                ai_supplier_name = (
                                    ai_parsed.get("supplier_name")
                                    if isinstance(ai_parsed, dict)
                                    else None
                                )
                                skraceni_naziv = (
                                    ai_supplier_name if ai_supplier_name else "Strani dobavljač"
                                )
                                supplier_info.update({"naziv_firme": skraceni_naziv})
                        except Exception as e:
                            logger.warning(
                                f"VIES validation failed for VAT number {vat_number}: {e}"
                            )
                            ai_supplier_name = (
                                ai_parsed.get("supplier_name") if isinstance(ai_parsed, dict) else None
                            )
                            skraceni_naziv = (
                                ai_supplier_name if ai_supplier_name else "Strani dobavljač"
                            )
                            supplier_info.update({"naziv_firme": skraceni_naziv})

            # Determine supplier name for OCR
            supplier_name_ocr = (
                skraceni_naziv
                or (
                    supplier_info.get("naziv_firme")
                    if isinstance(supplier_info, dict)
                    else None
                )
                or "Nepoznat dobavljač"
            )

            # Create Document entry
            doc = Document(
                filename=unique_name,
                ocrresult=text,
                supplier_id=None,
                supplier_name_ocr=supplier_name_ocr,
                supplier_oib=oib,
                archived_at=upload_time,
                date=upload_time,
                document_type=final_document_type,
                invoice_date=invoice_date,
                due_date=due_date,
                doc_number=doc_number,
                amount=amount_value,
                hash=file_hash,
                sudreg_response=(
                    json.dumps(
                        sudreg_raw,
                        ensure_ascii=False,
                        default=serialize_for_json,
                    )
                    if sudreg_raw
                    else None
                ),
                parsed=json.dumps(
                    parsed_data, ensure_ascii=False, default=serialize_for_json
                ),
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(
                f"Document saved with ID: {doc.id} and filename: {doc.filename}"
            )

            # Create and upsert annotation
            annotation_dict = build_auto_annotation_dict(
                final_document_type,
                oib,
                doc_number,
                invoice_date,
                due_date,
                parsed_data,
                skraceni_naziv,
                supplier_info,
            )
            upsert_document_annotations(db, doc.id, annotation_dict)

            # Index in Elasticsearch
            index_to_elasticsearch(doc)

            # Rename uploaded file to {id}.pdf
            try:
                new_filename = f"{doc.id}.pdf"
                new_path = os.path.join(UPLOAD_DIR, new_filename)
                os.rename(file_path, new_path)
                doc.filename = new_filename
                db.commit()
                logger.info(f"File renamed to {new_filename}")
            except Exception as e:
                logger.warning(f"File renaming failed: {e}")

            # Send training sample if training mode enabled
            if is_training_mode_enabled():
                try:
                    with tempfile.NamedTemporaryFile(
                        "w+", delete=False, suffix=".csv", encoding="utf-8", newline=""
                    ) as tf:
                        writer = csv.writer(tf)
                        writer.writerow(["text", "label"])
                        writer.writerow([text, final_document_type])
                        tf.flush()
                        tf.seek(0)
                        with open(tf.name, "rb") as f:
                            files_data = {
                                "file": (
                                    os.path.basename(tf.name),
                                    f,
                                    "text/csv",
                                )
                            }
                            resp = requests.post(
                                f"{model_server_url}/api/new_training_data",
                                files=files_data,
                                timeout=8,
                            )
                        os.unlink(tf.name)
                    if resp.ok:
                        logger.info(
                            f"Training sample sent for file {file.filename}"
                        )
                    else:
                        logger.warning(
                            f"Training sample NOT sent for file {file.filename}: {resp.text}"
                        )
                except Exception as e:
                    logger.error(
                        f"Error sending training sample for file {file.filename}: {e}"
                    )

            results.append(
                {
                    "id": doc.id,
                    "filename": doc.filename,
                    "original_filename": file.filename,
                    "status": "OK",
                    "supplier": supplier_info,
                    "document_type": final_document_type,
                    "parsed": parsed_data,
                }
            )

        if not results:
            logger.info(
                "Upload process finished, no documents processed because owner license recognized."
            )
            return {
                "processed": [],
                "message": "No documents processed because owner license recognized.",
            }

    except Exception as e:
        logger.error(f"Unexpected error during upload: {e}")
        return {"error": str(e)}
    finally:
        db.close()

    return {"processed": results}
