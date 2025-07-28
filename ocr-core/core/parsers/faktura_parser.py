# core/parsers/faktura_parser.py

import re
from datetime import datetime
from core.utils.regex_common import (
    extract_oib,
    extract_vat_number,
    extract_doc_number,
    extract_amount,
    extract_invoice_date,
    extract_due_date,
)

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

def parse_faktura_text(ocr_text: str) -> dict:
    parsed_data = {}

    # Basic extraction
    parsed_data["oib"] = extract_oib(ocr_text)
    parsed_data["vat_number"] = extract_vat_number(ocr_text)
    parsed_data["invoice_number"] = extract_doc_number(ocr_text)
    parsed_data["amount"] = extract_amount(ocr_text)
    parsed_data["invoice_date"] = extract_invoice_date(ocr_text)
    parsed_data["due_date"] = extract_due_date(ocr_text)

    # Napredniji fallback za datume ako nisu izvučeni – koristi stare metode ako trebaš
    # (prilagodi po potrebi)

    # Example: fallback na datume iz teksta (pretražuje po linijama)
    invoice_date = parsed_data["invoice_date"]
    due_date = parsed_data["due_date"]
    all_dates = []

    date_pattern_numeric = re.compile(r"(\d{1,2}[./]\d{1,2}[./]\d{4})")
    lines = ocr_text.splitlines()

    for i, line in enumerate(lines):
        # Croatian date format
        dt = parse_croatian_date(line)
        if dt:
            all_dates.append(dt)
        # English date format
        dt2 = parse_english_date(line)
        if dt2:
            all_dates.append(dt2)
        # Numeric date format
        matches = date_pattern_numeric.findall(line)
        for m in matches:
            try:
                date_str = m.replace("/", ".")
                d = datetime.strptime(date_str, "%d.%m.%Y").date()
                all_dates.append(d)
            except:
                continue

    if not invoice_date and all_dates:
        parsed_data["invoice_date"] = str(min(all_dates))
    if not due_date and all_dates:
        parsed_data["due_date"] = str(max(all_dates))

    return parsed_data
