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
from core.database.models import Document, Partner, DocumentAnnotation, Client
from core.parsers.supplier_extractor import extract_supplier_info
from core.utils.regex_common import extract_all_vats, extract_all_oibs, extract_invoice_date, extract_due_date
from core.routes.oibvalidator import is_valid_oib
from core.deployment import get_owner_oib
from modules.ocr_processing.workers.engine import perform_ocr
from modules.sudreg_api.client import SudregClient
from core.vies_api.client import ViesClient
from elasticsearch import Elasticsearch

AI_LABEL_MAPPING: Dict[str, str] = {
    "0": "FAKTURA",
    "1": "UGOVOR",
    "2": "IZVOD",
    "3": "CESIJA",
    "4": "IOS",
    "5": "KONTO_KARTICA",
    "6": "OSTALO",
    "7": "NEPOZNATO",
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

sudreg_client = SudregClient()
vies_client = ViesClient()

# --- NOVO: Dohvat svih owner OIB-eva i HR VAT-ova ---
def get_all_owner_oibs_and_hrvats(db: Session):
    oibs = set()
    hrvats = set()
    clients = db.query(Client).all()
    for c in clients:
        if getattr(c, "oib", None):
            oib = str(c.oib)
            oibs.add(oib)
            hrvats.add(f"HR{oib}")
    return oibs, hrvats

def str_to_date(date_str: Optional[str]):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%d.%m.%Y").date()
    except Exception as e:
        logger.error(f"Error parsing date '{date_str}': {e}")
        return None

def determine_final_document_type(
    document_type: str,
    ai_label: Optional[str],
    text: str,
) -> str:
    text_lower = text.lower()
    if document_type == "IRA":
        return "IRA"
    if ai_label and ai_label in AI_LABEL_MAPPING:
        label = AI_LABEL_MAPPING[ai_label]
        if label == "URA":
            return "FAKTURA"
        return label
    if "faktura" in text_lower or "račun" in text_lower:
        return "FAKTURA"
    return document_type or "OSTALO"

def serialize_for_json(obj: Any) -> Any:
    from modules.sudreg_api.schemas import SudregCompany
    if isinstance(obj, SudregCompany):
        return obj.dict()
    if hasattr(obj, "dict"):
        return obj.dict()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

def date_to_str(date_obj):
    if not date_obj:
        return None
    if isinstance(date_obj, str):
        return date_obj
    return date_obj.strftime("%d.%m.%Y")

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
    vat_number: Optional[str] = None,
    partner_obj: Optional[Partner] = None,
) -> Dict[str, Any]:
    supplier_name = skraceni_naziv or (
        supplier_info.get("naziv_firme") if isinstance(supplier_info, dict) else ""
    )
    partner_name = ""
    if partner_obj and getattr(partner_obj, "naziv", None):
        partner_name = partner_obj.naziv
    elif supplier_info and isinstance(supplier_info, dict):
        partner_name = supplier_info.get("naziv_firme") or ""

    vat_from_parsed = parsed_data.get("vat_number", None)
    vat_final = vat_number or vat_from_parsed
    return {
        "document_type": document_type,
        "oib": oib,
        "vat_number": vat_final,
        "invoice_number": doc_number,
        "date_invoice": date_to_str(invoice_date),
        "date_valute": date_to_str(due_date),
        "amount": str(
            parsed_data.get("total")
            or parsed_data.get("iznos")
            or parsed_data.get("amount")
            or ""
        ),
        "supplier_name": supplier_name,
        "partner_name": partner_name,
        "ai_suggestion": parsed_data.get("ai_suggestion"),
        "ai_score": parsed_data.get("ai_score"),
        "ai_conflict": parsed_data.get("ai_conflict"),
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

def sync_annotations_to_document(db: Session, doc: Document, annotations: Dict[str, Any]):
    mapping = {
        "supplier_name": "supplier_name_ocr",
        "oib": "supplier_oib",
        "date_invoice": "invoice_date",
        "due_date": "due_date",
        "invoice_number": "doc_number",
        "amount": "amount",
        "document_type": "document_type",
    }
    for ann_field, doc_field in mapping.items():
        if ann_field in annotations:
            new_value = annotations[ann_field]
            if new_value in [None, ""]:
                continue
            if ann_field == "amount" and isinstance(new_value, str):
                new_value = new_value.replace(",", ".")
            if ann_field == "amount":
                try:
                    new_value = float(new_value)
                except ValueError:
                    new_value = None
            current_value = getattr(doc, doc_field)
            if current_value != new_value:
                setattr(doc, doc_field, new_value)
    db.commit()

def is_training_mode_enabled() -> bool:
    return TRAINING_MODE_FLAG.get("enabled", False)

def merge_doc_fields(parsed: dict, ann_data: dict = None) -> dict:
    ann_data = ann_data or {}
    def get_value(key):
        return ann_data.get(key) if ann_data and ann_data.get(key) is not None else parsed.get(key)
    return {
        "amount": get_value("amount"),
        "invoice_number": get_value("invoice_number"),
        "oib": get_value("oib"),
        "supplier_name_ocr": get_value("supplier_name") or get_value("partner_name") or parsed.get("supplier_name") or parsed.get("partner_name"),
        "invoice_date": get_value("invoice_date"),
        "due_date": get_value("due_date"),
        "doc_number": get_value("invoice_number"),
    }

# ... [IMPORTS + sve isto do @router.post("/documents")]

def filter_owner_fields(parsed_data, all_owner_oibs, all_owner_hrvats):
    # Vrati novi dict gdje su owner OIB/VAT zamijenjeni s None
    if parsed_data.get("oib") in all_owner_oibs:
        parsed_data["oib"] = None
    if parsed_data.get("vat_number") and parsed_data["vat_number"].upper() in all_owner_hrvats:
        parsed_data["vat_number"] = None
    # Ako imaš i supplier_oib i on ti dolazi iz AI-a/parsera
    if parsed_data.get("supplier_oib") in all_owner_oibs:
        parsed_data["supplier_oib"] = None
    return parsed_data

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
        all_owner_oibs, all_owner_hrvats = get_all_owner_oibs_and_hrvats(db)
        logger.info(f"All owner OIBs: {all_owner_oibs}")
        logger.info(f"All owner HR VATs: {all_owner_hrvats}")

        for file in files:
            logger.info(f"Processing file: {file.filename}")
            ext = os.path.splitext(file.filename)[1]

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

            # OCR
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

            # AI classification
            ai_classify_result: Dict[str, Any] = {}
            try:
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
            ai_score = (
                ai_classify_result.get("best_score")
                if isinstance(ai_classify_result, dict)
                else None
            )

            # --- OIB kandidat: SVI OIB iz clients isključeni ---
            oib_candidates = [
                x for x in extract_all_oibs(text)
                if is_valid_oib(x) and x not in all_owner_oibs
            ]
            oib = oib_candidates[0] if oib_candidates else None
            if not oib:
                oib_ai = ai_parsed.get("oib") if isinstance(ai_parsed, dict) else None
                if oib_ai and oib_ai not in all_owner_oibs:
                    oib = oib_ai
                else:
                    oib = None

            doc_number = (
                ai_parsed.get("invoice_number") if isinstance(ai_parsed, dict) else None
            )

            invoice_date_str = (
                ai_parsed.get("date_issued") if isinstance(ai_parsed, dict) else None
            ) or extract_invoice_date(text)
            due_date_str = (
                ai_parsed.get("due_date") if isinstance(ai_parsed, dict) else None
            ) or extract_due_date(text)
            invoice_date = str_to_date(invoice_date_str)
            due_date = str_to_date(due_date_str)

            # --- VAT kandidat: samo HR-VAT (HR{OIB}) isključeni ---
            vat_ai = (
                ai_parsed.get("vat_number") if isinstance(ai_parsed, dict) else None
            )
            vat_number = None
            if vat_ai and vat_ai.upper() not in all_owner_hrvats:
                vat_number = vat_ai
            else:
                all_vats = extract_all_vats(text)
                filtered_vats = [
                    v for v in all_vats
                    if v.upper() not in all_owner_hrvats
                ]
                vat_number = filtered_vats[0] if filtered_vats else None

            text_lower = text.lower()

            final_document_type = determine_final_document_type(document_type, ai_label, text)

            parser = dispatch_parser(final_document_type)
            parser_output = parser(text)

            parsed_data: Dict[str, Any] = {}
            if isinstance(ai_parsed, dict):
                parsed_data.update({k: v for k, v in ai_parsed.items() if v is not None})

            for k, v in parser_output.items():
                if k not in parsed_data or parsed_data[k] in (None, '', [], {}):
                    parsed_data[k] = v

            # --- DODANO: filtriraj owner OIB/VAT iz parsed_data ---
            parsed_data = filter_owner_fields(parsed_data, all_owner_oibs, all_owner_hrvats)

            ai_conflict = False
            if document_type == "IRA":
                ai_suggestion = AI_LABEL_MAPPING.get(ai_label, None)
                ai_suggestion_score = ai_score
                if ai_suggestion and ai_suggestion != "IRA":
                    ai_conflict = True
                parsed_data["ai_suggestion"] = ai_suggestion
                parsed_data["ai_score"] = ai_suggestion_score
                parsed_data["ai_conflict"] = ai_conflict

            amount_value: Optional[float] = None
            for key in ("amount", "total", "iznos", "amount_total"):
                if key in parsed_data and parsed_data[key]:
                    try:
                        cleaned = (
                            str(parsed_data[key]).replace(".", "").replace(",", ".")
                        )
                        amount_value = float(cleaned)
                        break
                    except Exception:
                        pass

            supplier_info = extract_supplier_info(text)
            if not isinstance(supplier_info, dict):
                supplier_info = {}
            skraceni_naziv: Optional[str] = None
            partner_obj: Optional[Partner] = None
            sudreg_data = None
            sudreg_raw = None
            vies_data = None

            if not oib and not vat_number:
                skraceni_naziv = "Nepoznat dobavljač"
            else:
                if oib:
                    partner_obj = db.query(Partner).filter_by(oib=oib).first()
                    if partner_obj or oib not in all_owner_oibs:
                        if partner_obj:
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
                                    try:
                                        country_code = oib[:2]
                                        vat = oib[2:]
                                        vies_data = vies_client.validate_vat(country_code, vat)
                                        novi_partner.vies_response = vies_data
                                        db.commit()
                                    except Exception as e:
                                        logger.warning(f"VIES validation failed for OIB {oib}: {e}")
                                    partner_obj = novi_partner
                            except Exception as e:
                                sudreg_raw = {"error": str(e)}
                                supplier_info["alert"] = f"❗ Sudreg API error: {e}"
                                logger.warning(
                                    f"Error fetching Sudreg data for OIB {oib}: {e}"
                                )
                else:
                    if vat_number:
                        try:
                            country_code = vat_number[:2]
                            vat = vat_number[2:]
                            vies_data = vies_client.call_vies_soap_api(country_code, vat)
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

            # ----------- KORISTI ISTU LOGIKU KAO U REPARSE ---------
            doc_fields = merge_doc_fields(parsed_data)
            # Hard filtriraj owner OIB u doc_fields!
            if doc_fields["oib"] in all_owner_oibs:
                doc_fields["oib"] = None
            # Override naziv partnera s baze/partnera
            if partner_obj and getattr(partner_obj, "naziv", None):
                doc_fields["supplier_name_ocr"] = partner_obj.naziv
            elif skraceni_naziv:
                doc_fields["supplier_name_ocr"] = skraceni_naziv
            elif supplier_info.get("naziv_firme"):
                doc_fields["supplier_name_ocr"] = supplier_info.get("naziv_firme")
            # -------------------------------------------------------

            doc = Document(
                filename=unique_name,
                ocrresult=text,
                supplier_id=None,
                supplier_name_ocr=doc_fields["supplier_name_ocr"] or "Nepoznat dobavljač",
                supplier_oib=doc_fields["oib"],
                archived_at=upload_time,
                date=upload_time,
                document_type=final_document_type,
                invoice_date=doc_fields["invoice_date"],
                due_date=doc_fields["due_date"],
                doc_number=doc_fields["doc_number"],
                amount=doc_fields["amount"],
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
            logger.info(f"Document object: {doc}")
            logger.info(f"invoice_date: {doc.invoice_date} ({type(doc.invoice_date)})")
            logger.info(f"due_date: {doc.due_date} ({type(doc.due_date)})")

            logger.info(
                f"Document saved with ID: {doc.id} and filename: {doc.filename}"
            )

            annotation_dict = build_auto_annotation_dict(
                final_document_type,
                doc_fields["oib"],
                doc_fields["doc_number"],
                doc_fields["invoice_date"],
                doc_fields["due_date"],
                parsed_data,
                doc_fields["supplier_name_ocr"],
                supplier_info,
                vat_number=vat_number,
                partner_obj=partner_obj,
            )
            upsert_document_annotations(db, doc.id, annotation_dict)
            sync_annotations_to_document(db, doc, annotation_dict)

            index_to_elasticsearch(doc)

            # FILE RENAME NA ID – **OVO JE KORIGIRAN BLOK**
            try:
                new_filename = f"{doc.id}.pdf"
                new_path = os.path.join(UPLOAD_DIR, new_filename)
                os.rename(file_path, new_path)
                doc.filename = new_filename
                db.commit()
                db.refresh(doc)
                logger.info(f"File renamed to {new_filename}")
                logger.info(f"Trying to rename {file_path} -> {new_path}")
                logger.info(f"Exists file_path: {os.path.exists(file_path)}; Exists new_path: {os.path.exists(new_path)}")

            except Exception as e:
                logger.warning(f"File renaming failed: {e}")

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
