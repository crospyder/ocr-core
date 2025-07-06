import os
import uuid
import json
from pydantic import BaseModel
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from core.parsers.dispatcher import dispatch_parser
from core.database.connection import SessionMain
from core.database.models import Document, Client
from core.parsers.supplier_extractor import extract_supplier_info
from modules.sudreg_api.client import SudregClient
from modules.ocr_processing.workers.engine import perform_ocr

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

sudreg_client = SudregClient()

def str_to_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None

@router.post("/documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    document_type: str = Form(...)
):
    results = []
    db = SessionMain()

    for file in files:
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "FAILED",
                "error": str(e)
            })
            continue

        upload_time = datetime.utcnow()
        text = perform_ocr(file_path)

        # Parsiranje podataka prema tipu dokumenta
        try:
            parser_func = dispatch_parser(document_type)
            parsed_data = parser_func(text)
        except Exception as e:
            parsed_data = {"parser_error": str(e)}

        # Izvlačenje dobavljača iz OCR teksta
        supplier_info = extract_supplier_info(text)
        oib = supplier_info.get("oib")

        sudreg_data = None
        sudreg_raw = None
        skraceni_naziv = None

        if oib:
            try:
                sudreg_data, sudreg_raw = sudreg_client.get_company_by_oib(oib, db)
                if sudreg_data:
                    supplier_info.update({
                        "naziv_firme": sudreg_data.naziv,
                        "adresa": sudreg_data.adresa,
                        "oib": sudreg_data.oib,
                    })

                if sudreg_raw and isinstance(sudreg_raw, dict):
                    skracene_tvrtke = sudreg_raw.get("skracene_tvrtke")
                    if (
                        skracene_tvrtke
                        and isinstance(skracene_tvrtke, list)
                        and len(skracene_tvrtke) > 0
                    ):
                        skraceni_naziv = skracene_tvrtke[0].get("ime")
                else:
                    supplier_info["alert"] = "⚠️ Dobavljač nije pronađen u Sudregu"
            except Exception as e:
                sudreg_raw = {"error": str(e)}
                supplier_info["alert"] = f"❌ Greška u komunikaciji sa Sudreg API-jem: {e}"
        else:
            supplier_info["alert"] = "❌ OIB nije pronađen – potrebna ručna validacija dokumenta."

        supplier_obj = db.query(Client).filter(Client.oib == oib).first() if oib else None
        ocr_processed_at = datetime.utcnow()

        # Sigurna konverzija parsed_data za JSON spremanje
        if isinstance(parsed_data, dict):
            safe_parsed = {
                k: v.dict() if isinstance(v, BaseModel) else v
                for k, v in parsed_data.items()
            }
        elif isinstance(parsed_data, BaseModel):
            safe_parsed = parsed_data.dict()
        else:
            safe_parsed = parsed_data

        # Parsiranje i fallback za due_date
        invoice_date = str_to_date(safe_parsed.get("invoice_date"))
        due_date = str_to_date(safe_parsed.get("due_date"))
        if due_date is None and invoice_date is not None:
            due_date = invoice_date

        doc = Document(
            filename=unique_name,
            ocrresult=text,
            supplier_id=supplier_obj.id if supplier_obj else None,
            supplier_name_ocr=skraceni_naziv or supplier_info.get("naziv_firme") or None,
            supplier_oib=oib,
            archived_at=upload_time,
            date=ocr_processed_at,
            document_type=document_type,
            invoice_date=invoice_date,
            due_date=due_date,
            sudreg_response=json.dumps(sudreg_raw, ensure_ascii=False) if sudreg_raw else None,
            parsed=json.dumps(safe_parsed, ensure_ascii=False),
        )

        db.add(doc)
        db.commit()
        db.refresh(doc)

        results.append({
            "id": doc.id,
            "filename": unique_name,
            "original_filename": file.filename,
            "status": "OK",
            "ocrresult_preview": text[:300] + "..." if text and len(text) > 300 else text,
            "ocrresult_full": text,
            "supplier": supplier_info,
            "sudreg_data": sudreg_data.dict() if sudreg_data else None,
            "document_type": document_type,
            "parsed": safe_parsed,
        })

    db.close()
    return {"processed": results}
