import os
import uuid
import json
import logging
import re
import hashlib
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session
from core.parsers.dispatcher import dispatch_parser
from core.database.connection import SessionMain, get_db
from core.database.models import Document, Client, Partner
from core.parsers.supplier_extractor import extract_supplier_info
from modules.sudreg_api.client import SudregClient
from modules.ocr_processing.workers.engine import perform_ocr
from core.deployment import get_owner_oib
from core.utils.regex import extract_doc_number, extract_all_vats, COUNTRY_VAT_REGEX, extract_dates
from core.routes.oibvalidator import is_valid_oib

from core.vies_api.client import ViesClient

from elasticsearch import Elasticsearch
es = Elasticsearch(["http://localhost:9200"])

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

sudreg_client = SudregClient()
vies_client = ViesClient()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

def serialize_for_json(obj):
    from modules.sudreg_api.schemas import SudregCompany
    if isinstance(obj, SudregCompany):
        logger.debug(f"Serializing SudregCompany object: {obj}")
        return obj.dict()
    if isinstance(obj, BaseModel):
        logger.debug(f"Serializing Pydantic BaseModel: {obj}")
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

def slugify(text):
    return re.sub(r"[^a-zA-Z0-9]+", "", text.lower())

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

def extract_all_oibs(text: str) -> list[str]:
    pattern = r"\b\d{11}\b"
    return re.findall(pattern, text)

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

@router.post("/documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    document_type: str = Form(...)
):
    logger.info(f"Starting upload process for {len(files)} files, document type: '{document_type}'")
    results = []
    db = SessionMain()

    try:
        owner_oib = get_owner_oib(db)
        owner_vat = f"HR{owner_oib}" if owner_oib else None
        logger.info(f"Owner OIB: {owner_oib}, Owner VAT: {owner_vat}")

        for file in files:
            logger.info(f"Processing file: {file.filename}")
            ext = os.path.splitext(file.filename)[1]

            hasher = hashlib.sha256()
            content_bytes = b""
            while True:
                chunk = await file.read(1024*1024)  # 1MB chunk
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
                text = perform_ocr(file_path)
                logger.info(f"OCR successful for {unique_name}")
            except Exception as e:
                logger.error(f"OCR error for {file.filename}: {e}")
                results.append({"filename": file.filename, "status": "FAILED", "error": f"OCR error: {str(e)}"})
                continue

            try:
                parser_func = dispatch_parser(document_type)
                parsed_data = parser_func(text)
                logger.info(f"Parsing successful for {file.filename}")
            except Exception as e:
                logger.warning(f"Parsing failed for {file.filename}: {e}")
                parsed_data = {"parser_error": str(e)}

            supplier_info = extract_supplier_info(text)

            all_oibs_list = extract_all_oibs(text)
            logger.info(f"All detected OIBs: {all_oibs_list}")

            filtered_oibs = [x for x in all_oibs_list if is_valid_oib(x) and x != owner_oib]
            logger.info(f"Valid OIBs after checksum validation: {filtered_oibs}")

            all_vats = extract_all_vats(text)
            filtered_vats = [x for x in all_vats if owner_vat is None or x.upper() != owner_vat.upper()]

            if not filtered_vats and owner_vat and owner_vat in all_vats:
                filtered_vats = [owner_vat]

            oib = filtered_oibs[0] if filtered_oibs else None
            vat_number = filtered_vats[0] if filtered_vats else None

            logger.info(f"Selected OIB for further processing: {oib}, VAT: {vat_number}")

            partner_obj = None
            sudreg_data = None
            sudreg_raw = None
            skraceni_naziv = None
            vies_data = None

            if not oib and not vat_number:
                logger.warning(f"No OIB or VAT for document {file.filename}, using 'Unknown supplier'")
                skraceni_naziv = "Nepoznat dobavljač"
            else:
                if oib:
                    partner_obj = db.query(Partner).filter_by(oib=oib).first()

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
                                logger.debug(f"VIES response for {oib}: {vies_data}")
                            except Exception as e:
                                logger.warning(f"VIES validation failed for OIB {oib}: {e}")
                        else:
                            vies_data = partner_obj.vies_response
                            logger.debug(f"VIES data retrieved from DB for partner {oib}: {vies_data}")

                    else:
                        try:
                            sudreg_data, sudreg_raw = sudreg_client.get_company_by_oib(oib, db)
                            logger.debug(f"Sudreg raw response for OIB {oib}: {sudreg_raw}")
                            if sudreg_data:
                                if sudreg_raw and isinstance(sudreg_raw, dict):
                                    skracene_tvrtke = sudreg_raw.get("skracene_tvrtke")
                                    if skracene_tvrtke and isinstance(skracene_tvrtke, list):
                                        skraceni_naziv = skracene_tvrtke[0].get("ime")

                                partner_naziv = skraceni_naziv or sudreg_data.naziv

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
                                    logger.debug(f"VIES response for new partner {oib}: {vies_data}")
                                except Exception as e:
                                    logger.warning(f"VIES validation failed for OIB {oib}: {e}")

                        except Exception as e:
                            sudreg_raw = {"error": str(e)}
                            supplier_info["alert"] = f"❗ Sudreg API error: {e}"
                            logger.warning(f"Error fetching Sudreg data for OIB {oib}: {e}")

                else:
                    if vat_number:
                        logger.info(f"EU VAT number detected in OCR text: {vat_number}")
                        try:
                            country_code = vat_number[:2]
                            vat = vat_number[2:]
                            vies_data = vies_client.call_vies_soap_api(country_code, vat)
                            supplier_info.update({
                                "naziv_firme": vies_data.get("name"),
                                "adresa": vies_data.get("address"),
                            })
                            skraceni_naziv = vies_data.get("name")

                            if vies_data.get("valid") and vies_data.get("name"):
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
                                logger.warning(f"Invalid data from VIES API for VAT number {vat_number}, partner not saved.")

                        except Exception as e:
                            logger.warning(f"VIES validation failed for VAT number {vat_number}: {e}")

            dates_found = extract_dates(text)
            invoice_date = str_to_date(dates_found.get("invoice_date") or dates_found.get("any_date"))
            due_date = str_to_date(dates_found.get("due_date"))

            if invoice_date and not due_date:
                due_date = invoice_date
            if due_date and not invoice_date:
                invoice_date = due_date

            delivery_date = str_to_date(dates_found.get("delivery_date"))
            entry_date = str_to_date(dates_found.get("entry_date"))

            doc_number = extract_doc_number(text)
            logger.info(f"Document number extracted from OCR: {doc_number}")

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
                    doc_number=doc_number,
                    hash=file_hash,
                    sudreg_response=json.dumps(sudreg_raw, ensure_ascii=False, default=serialize_for_json) if sudreg_raw else None,
                    parsed=json.dumps(parsed_data, ensure_ascii=False, default=serialize_for_json),
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                logger.info(f"Document saved with ID: {doc.id} and filename: {doc.filename}")

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

            except Exception as e:
                db.rollback()
                logger.error(f"Error saving document to DB: {e}")
                results.append({"filename": file.filename, "status": "FAILED", "error": f"DB error: {str(e)}"})
                continue

            results.append({
                "id": doc.id,
                "filename": doc.filename,
                "original_filename": file.filename,
                "status": "OK",
                "supplier": supplier_info,
                "sudreg_data": sudreg_data.dict() if sudreg_data else None,
                "vies_data": vies_data,
                "document_type": document_type,
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

# NOVO: zajednička funkcija za batch obradu i ručni upload attachmenta
async def process_uploaded_file(file_bytes: bytes, filename: str, document_type: str):
    logger.info(f"process_uploaded_file start: {filename}")
    db = SessionMain()
    try:
        ext = os.path.splitext(filename)[1]

        hasher = hashlib.sha256()
        hasher.update(file_bytes)
        file_hash = hasher.hexdigest()
        logger.info(f"File hash: {file_hash}")

        existing_doc = db.query(Document).filter_by(hash=file_hash).first()
        if existing_doc:
            logger.warning(f"Duplicate document detected: {filename} (hash: {file_hash}) - skipping")
            return {"status": "DUPLICATE", "existing_id": existing_doc.id, "message": "Duplicate document"}

        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        try:
            with open(file_path, "wb") as f:
                f.write(file_bytes)
            logger.info(f"File saved as {unique_name}")
        except Exception as e:
            logger.error(f"Failed to save file {filename}: {e}")
            return {"status": "FAILED", "error": str(e)}

        upload_time = datetime.utcnow()

        try:
            text = perform_ocr(file_path)
            logger.info(f"OCR successful for {unique_name}")
        except Exception as e:
            logger.error(f"OCR failed for {filename}: {e}")
            return {"status": "FAILED", "error": f"OCR error: {str(e)}"}

        try:
            parser_func = dispatch_parser(document_type)
            parsed_data = parser_func(text)
            logger.info(f"Parsing successful for {filename}")
        except Exception as e:
            logger.warning(f"Parsing failed for {filename}: {e}")
            parsed_data = {"parser_error": str(e)}

        supplier_info = extract_supplier_info(text)

        owner_oib = get_owner_oib(db)
        owner_vat = f"HR{owner_oib}" if owner_oib else None

        all_oibs_list = extract_all_oibs(text)
        filtered_oibs = [x for x in all_oibs_list if is_valid_oib(x) and x != owner_oib]

        all_vats = extract_all_vats(text)
        filtered_vats = [x for x in all_vats if owner_vat is None or x.upper() != owner_vat.upper()]

        if not filtered_vats and owner_vat and owner_vat in all_vats:
            filtered_vats = [owner_vat]

        oib = filtered_oibs[0] if filtered_oibs else None
        vat_number = filtered_vats[0] if filtered_vats else None

        skraceni_naziv = None
        partner_obj = None
        sudreg_data = None
        sudreg_raw = None
        vies_data = None

        if not oib and not vat_number:
            logger.warning(f"No OIB or VAT for document {filename}, using 'Unknown supplier'")
            skraceni_naziv = "Nepoznat dobavljač"
        else:
            if oib:
                partner_obj = db.query(Partner).filter_by(oib=oib).first()

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
                            logger.debug(f"VIES response for {oib}: {vies_data}")
                        except Exception as e:
                            logger.warning(f"VIES validation failed for OIB {oib}: {e}")
                    else:
                        vies_data = partner_obj.vies_response
                        logger.debug(f"VIES data retrieved from DB for partner {oib}: {vies_data}")

                else:
                    try:
                        sudreg_data, sudreg_raw = sudreg_client.get_company_by_oib(oib, db)
                        logger.debug(f"Sudreg raw response for OIB {oib}: {sudreg_raw}")
                        if sudreg_data:
                            if sudreg_raw and isinstance(sudreg_raw, dict):
                                skracene_tvrtke = sudreg_raw.get("skracene_tvrtke")
                                if skracene_tvrtke and isinstance(skracene_tvrtke, list):
                                    skraceni_naziv = skracene_tvrtke[0].get("ime")

                            partner_naziv = skraceni_naziv or sudreg_data.naziv

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
                                logger.debug(f"VIES response for new partner {oib}: {vies_data}")
                            except Exception as e:
                                logger.warning(f"VIES validation failed for OIB {oib}: {e}")

                    except Exception as e:
                        sudreg_raw = {"error": str(e)}
                        supplier_info["alert"] = f"❗ Sudreg API error: {e}"
                        logger.warning(f"Error fetching Sudreg data for OIB {oib}: {e}")

            else:
                if vat_number:
                    logger.info(f"EU VAT number detected in OCR text: {vat_number}")
                    try:
                        country_code = vat_number[:2]
                        vat = vat_number[2:]
                        vies_data = vies_client.call_vies_soap_api(country_code, vat)
                        supplier_info.update({
                            "naziv_firme": vies_data.get("name"),
                            "adresa": vies_data.get("address"),
                        })
                        skraceni_naziv = vies_data.get("name")

                        if vies_data.get("valid") and vies_data.get("name"):
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
                            logger.warning(f"Invalid data from VIES API for VAT number {vat_number}, partner not saved.")

                    except Exception as e:
                        logger.warning(f"VIES validation failed for VAT number {vat_number}: {e}")

        dates_found = extract_dates(text)
        invoice_date = str_to_date(dates_found.get("invoice_date") or dates_found.get("any_date"))
        due_date = str_to_date(dates_found.get("due_date"))

        if invoice_date and not due_date:
            due_date = invoice_date
        if due_date and not invoice_date:
            invoice_date = due_date

        delivery_date = str_to_date(dates_found.get("delivery_date"))
        entry_date = str_to_date(dates_found.get("entry_date"))

        doc_number = extract_doc_number(text)
        logger.info(f"Document number extracted from OCR: {doc_number}")

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
                doc_number=doc_number,
                hash=file_hash,
                sudreg_response=json.dumps(sudreg_raw, ensure_ascii=False, default=serialize_for_json) if sudreg_raw else None,
                parsed=json.dumps(parsed_data, ensure_ascii=False, default=serialize_for_json),
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(f"Document saved with ID: {doc.id} and filename: {doc.filename}")

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

        except Exception as e:
            db.rollback()
            logger.error(f"Error saving document to DB: {e}")
            return {"status": "FAILED", "error": f"DB error: {str(e)}"}

        return {
            "status": "OK",
            "id": doc.id,
            "filename": doc.filename,
            "original_filename": filename,
            "supplier": supplier_info,
            "sudreg_data": sudreg_data.dict() if sudreg_data else None,
            "vies_data": vies_data,
            "document_type": document_type,
            "parsed": parsed_data,
        }
    finally:
        db.close()
        logger.info(f"process_uploaded_file finished: {filename}")
