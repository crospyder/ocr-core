import os
import json
import subprocess
import csv
import io
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from core.database.connection import get_db
from core.database.models import Partner, Document

router = APIRouter()

IMPORT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "import"))
os.makedirs(IMPORT_DIR, exist_ok=True)

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "uvoz"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_mapping_filepath(software_name: str) -> str:
    safe_name = "".join(c for c in software_name if c.isalnum() or c in "-_").lower()
    return os.path.join(IMPORT_DIR, f"{safe_name}-import.json")

def parse_synesis_datetime(date_str):
    if not date_str or date_str.strip() == "":
        return None
    for fmt in ("%d.%m.%Y", "%d.%m.%Y %H:%M:%S", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%m/%d/%y %H:%M:%S", "%m/%d/%Y %H:%M:%S"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except Exception:
            continue
    print(f"[ERROR] Nepoznat format datuma: {date_str}")
    return None

@router.get("/api/import/mapping/{software_name}")
async def get_mapping(software_name: str):
    path = get_mapping_filepath(software_name)
    if not os.path.isfile(path):
        print(f"[DEBUG] Mapping file does not exist: {path}")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        print(f"[DEBUG] Returning mapping file: {path}")
        return json.load(f)

@router.post("/api/import/mapping/{software_name}")
async def save_mapping(software_name: str, request: Request):
    path = get_mapping_filepath(software_name)
    try:
        data = await request.json()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[DEBUG] Mapping successfully saved to {path}")
        return {"message": "Mapiranje uspješno spremljeno"}
    except Exception as e:
        print(f"[ERROR] Error saving mapping: {e}")
        raise HTTPException(status_code=500, detail=f"Greška pri spremanju mapiranja: {str(e)}")

@router.post("/api/import/do_import/{software_name}")
async def do_import(software_name: str, request: Request, db: Session = Depends(get_db)):
    print(f"[DEBUG] do_import called for software_name: {software_name}")
    data = await request.json()
    filename = data.get("filename")
    print(f"[DEBUG] Import filename: {filename}")

    if not filename:
        print("[ERROR] Nedostaje filename")
        raise HTTPException(status_code=400, detail="Nedostaje filename")

    # Load mapping or create empty if missing
    path = get_mapping_filepath(software_name)
    if not os.path.isfile(path):
        print(f"[WARNING] Mapping file missing, creating: {path}")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({}, f)
    with open(path, "r", encoding="utf-8") as f:
        mapping = json.load(f)
    print(f"[DEBUG] Loaded mapping: {json.dumps(mapping, indent=2, ensure_ascii=False)}")

    # Parse real data from MDB, expects mapping keys: "PARTNERS", "INVOICES"
    needed_tables = list(mapping.keys())
    print(f"[DEBUG] Tables to import: {needed_tables}")
    parsed_data = load_all_mdb_data(filename, needed_tables)
    print(f"[DEBUG] Parsed MDB data keys: {list(parsed_data.keys())}")

    imported_partners = 0
    skipped_partners = 0

    try:
        if "PARTNERS" in mapping and "PARTNERS" in parsed_data:
            print("[DEBUG] Importing partners...")
            for i, row in enumerate(parsed_data["PARTNERS"]):
                try:
                    partner = map_row_to_partner(row, mapping["PARTNERS"], db)
                    imported_partners += 1
                except Exception as ex:
                    print(f"[WARNING] Preskačem partnera bez OIB/VAT_ID (row {i}): {row}")
                    skipped_partners += 1

        if "INVOICES" in mapping and "INVOICES" in parsed_data:
            print("[DEBUG] Importing invoices...")
            for i, row in enumerate(parsed_data["INVOICES"]):
                print(f"[DEBUG] Invoice row {i}: {row}")
                document = map_row_to_document(row, mapping["INVOICES"], db)

        db.commit()
        print("[DEBUG] Import commit OK")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during import: {e}")
        raise HTTPException(status_code=500, detail=f"Greška prilikom uvoza: {str(e)}")

    return {
        "message": "Uvoz završen",
        "imported_partners": imported_partners,
        "skipped_partners": skipped_partners
    }

def parse_mdb_table(filename: str, table: str) -> list:
    """Ekstrahira podatke iz tablice MDB fajla koristeći mdb-export i vraća kao listu dictova."""
    mdb_path = os.path.join(UPLOAD_DIR, filename)
    print(f"[DEBUG] Reading table {table} from {mdb_path}")
    try:
        result = subprocess.run(
            ["mdb-export", mdb_path, table],
            capture_output=True, text=True, check=True
        )
        reader = csv.DictReader(io.StringIO(result.stdout))
        rows = list(reader)
        print(f"[DEBUG] Got {len(rows)} rows from table {table}")
        return rows
    except Exception as ex:
        print(f"[ERROR] Greška pri čitanju {table} iz {filename}: {ex}")
        return []

def load_all_mdb_data(filename: str, tables: list) -> dict:
    data = {}
    for tab in tables:
        data[tab] = parse_mdb_table(filename, tab)
    return data

def map_row_to_partner(row: dict, mapping: dict, db: Session):
    oib = row.get(mapping.get("oib", ""), None)
    vat_id = row.get(mapping.get("VAT_ID", ""), None) or row.get(mapping.get("OIB", ""), None)

    if not oib and not vat_id:
        raise Exception("Partner nema OIB ni VAT ID u uvoznim podacima")

    # Traži postojećeg partnera po OIB-u ili VAT_ID-u
    partner = None
    if oib:
        partner = db.query(Partner).filter(Partner.oib == oib.strip()).first()
    if not partner and vat_id:
        partner = db.query(Partner).filter(Partner.vat_id == vat_id.strip()).first()

    if not partner:
        partner = Partner()
        db.add(partner)

    partner.oib = oib.strip() if oib else None
    partner.vat_id = vat_id.strip() if vat_id else None
    partner.naziv = row.get(mapping.get("naziv", ""), "").strip()
    partner.adresa = row.get(mapping.get("adresa", ""), "").strip()
    partner.kontakt_telefon = row.get(mapping.get("kontakt_telefon", ""), "").strip()
    partner.kontakt_email = row.get(mapping.get("kontakt", ""), "").strip()
    partner.kontakt_osoba = row.get(mapping.get("kontakt_osoba", ""), "").strip()
    return partner

def map_row_to_document(row: dict, mapping: dict, db: Session):
    document = Document()
    document.doc_number = row.get(mapping.get("broj_racuna", ""), "").strip()
    document.date = parse_synesis_datetime(row.get(mapping.get("datum_racuna", ""), None))
    document.amount = row.get(mapping.get("iznos", ""), 0)
    document.filename = "synesis-uvoz"
    document.import_source = "uvoz_baza"
    document.document_type = "IRA"

    document.supplier_oib = row.get(mapping.get("partner_oib", ""), "").strip()
    document.supplier_name_ocr = row.get(mapping.get("kupac_naziv", ""), "").strip()
    document.invoice_date = parse_synesis_datetime(row.get(mapping.get("datum_racuna", ""), None))
    document.due_date = parse_synesis_datetime(
        row.get(mapping.get("datum_dospijeca", ""), None) or row.get("INVOICE_DUEDATE", None)
    )

    # Pronađi partnera po OIB-u i veži ako postoji
    partner_oib = document.supplier_oib
    partner = None
    if partner_oib:
        partner = db.query(Partner).filter(Partner.oib == partner_oib).first()
    if partner:
        document.supplier_id = partner.id
    else:
        document.supplier_id = None  # ili ostavi null, nema FK error jer FK je nullable

    db.add(document)
    return document