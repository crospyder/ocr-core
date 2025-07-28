# core/parsers/invoice_parser.py
import re
from datetime import datetime
from core.parsers.supplier_extractor import extract_supplier_info
from modules.sudreg_api.client import SudregClient

HR_MONTHS = {
    "siječnja": 1, "veljače": 2, "ožujka": 3, "travnja": 4,
    "svibnja": 5, "lipnja": 6, "srpnja": 7, "kolovoza": 8,
    "rujna": 9, "listopada": 10, "studenoga": 11, "prosinca": 12,
    "siječanj": 1, "veljača": 2, "ožujak": 3, "travanj": 4,
    "svibanj": 5, "lipanj": 6, "srpanj": 7, "kolovoz": 8,
    "rujan": 9, "listopad": 10, "studeni": 11, "prosinac": 12,
}

def parse_croatian_date(date_str: str):
    pattern = re.compile(r"(\d{1,2})\.?\s+([a-zćčžđš]+)\s+(\d{4})\.?", re.IGNORECASE)
    match = pattern.search(date_str)
    if not match:
        return None
    
    day, month_str, year = match.groups()
    month = HR_MONTHS.get(month_str.lower())
    if not month:
        return None
    try:
        return datetime(year=int(year), month=month, day=int(day)).date()
    except:
        return None

def parse_english_date(date_str: str):
    months = {
        "january":1, "february":2, "march":3, "april":4, "may":5, "june":6,
        "july":7, "august":8, "september":9, "october":10, "november":11, "december":12,
        "jan":1, "feb":2, "mar":3, "apr":4, "jun":6, "jul":7, "aug":8, "sep":9, "oct":10, "nov":11, "dec":12
    }
    clean_str = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_str.lower())
    pattern = re.compile(r"(\d{1,2})\s+([a-z]+)\s+(\d{4})")
    match = pattern.search(clean_str)
    if not match:
        return None
    
    day, month_str, year = match.groups()
    month = months.get(month_str)
    if not month:
        return None
    try:
        return datetime(year=int(year), month=month, day=int(day)).date()
    except:
        return None

def parse_invoice_text(ocr_text: str) -> dict:
    parsed_data = {}
    client = SudregClient()

    try:
        supplier_info = extract_supplier_info(ocr_text)
        parsed_data.update(supplier_info)

        sudreg_data, _ = client.get_company_by_oib(supplier_info.get('oib', ''))
        parsed_data['sudreg'] = sudreg_data
    except Exception as e:
        parsed_data['error'] = str(e)
        return parsed_data

    invoice_keys = [
        "vrijeme izdavanja", "datum isporuke", "datum unosa", "datum izdavanja", "račun", "invoice date"
    ]
    due_keys = [
        "datum dospijeća", "rok plaćanja", "valuta", "due date", "payment due"
    ]

    date_pattern_numeric = re.compile(r"(\d{1,2}[./]\d{1,2}[./]\d{4})")
    ignore_date_keywords = ["osnivanje", "osnovan", "osnovan dana"]

    lines = ocr_text.splitlines()
    invoice_date = None
    due_date = None
    all_dates = []

    def is_ignored_date_line(line):
        return any(keyword in line.lower() for keyword in ignore_date_keywords)

    for i, line in enumerate(lines):
        line_lower = line.lower()

        # Traži invoice_date
        if any(k in line_lower for k in invoice_keys) and not is_ignored_date_line(line):
            for j in range(1, 4):
                if i + j < len(lines):
                    text_to_check = lines[i + j]
                    if is_ignored_date_line(text_to_check):
                        continue
                    dt = parse_croatian_date(text_to_check) or parse_english_date(text_to_check)
                    if dt:
                        invoice_date = dt
                        all_dates.append(dt)
                        break
                    matches = date_pattern_numeric.findall(text_to_check)
                    if matches:
                        try:
                            date_str = matches[0].replace("/", ".")
                            dt = datetime.strptime(date_str, "%d.%m.%Y").date()
                            invoice_date = dt
                            all_dates.append(dt)
                            break
                        except Exception:
                            continue

        # Traži due_date
        if any(k in line_lower for k in due_keys) and not is_ignored_date_line(line):
            for j in range(1, 4):
                if i + j < len(lines):
                    text_to_check = lines[i + j]
                    if is_ignored_date_line(text_to_check):
                        continue
                    dt = parse_croatian_date(text_to_check) or parse_english_date(text_to_check)
                    if dt:
                        due_date = dt
                        all_dates.append(dt)
                        break
                    matches = date_pattern_numeric.findall(text_to_check)
                    if matches:
                        try:
                            date_str = matches[0].replace("/", ".")
                            dt = datetime.strptime(date_str, "%d.%m.%Y").date()
                            due_date = dt
                            all_dates.append(dt)
                            break
                        except Exception:
                            continue

    # fallback ako nisu pronađeni invoice_date ili due_date
    if not invoice_date and all_dates:
        invoice_date = min(all_dates)
    if not due_date and all_dates:
        due_date = max(all_dates)

    parsed_data["invoice_date"] = str(invoice_date) if invoice_date else None
    parsed_data["due_date"] = str(due_date) if due_date else None

    return parsed_data
