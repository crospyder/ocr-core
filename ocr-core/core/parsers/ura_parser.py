import re
from datetime import datetime
from core.parsers.supplier_extractor import extract_supplier_info
from modules.sudreg_api.client import SudregClient

# Mapa mjeseci u genitivu i nominativu (hrvatski)
HR_MONTHS = {
    "siječnja": 1, "veljače": 2, "ožujka": 3, "travnja": 4,
    "svibnja": 5, "lipnja": 6, "srpnja": 7, "kolovoza": 8,
    "rujna": 9, "listopada": 10, "studenoga": 11, "prosinca": 12,
    "siječanj": 1, "veljača": 2, "ožujak": 3, "travanj": 4,
    "svibanj": 5, "lipanj": 6, "srpanj": 7, "kolovoz": 8,
    "rujan": 9, "listopad": 10, "studeni": 11, "prosinac": 12,
}

def parse_croatian_date(date_str: str):
    """Parsira hrvatski datum tipa '19. listopada 2023.' ili '19 listopad 2023'."""
    pattern = re.compile(r"(\d{1,2})\.?\s+([a-zćčžđš]+)\s+(\d{4})\.?", re.IGNORECASE)
    match = pattern.search(date_str)
    if not match:
        return None
    
    day, month_str, year = match.groups()
    month_str = month_str.lower()
    month = HR_MONTHS.get(month_str)
    if not month:
        return None
    try:
        return datetime(year=int(year), month=month, day=int(day)).date()
    except:
        return None

def parse_english_date(date_str: str):
    """
    Parsira engleski datum tipa '29th March 2024', '1st January 2023', '15 Feb 2025', itd.
    Vraća datetime.date ili None ako ne može parsirati.
    """
    months = {
        "january":1, "february":2, "march":3, "april":4, "may":5, "june":6,
        "july":7, "august":8, "september":9, "october":10, "november":11, "december":12,
        "jan":1, "feb":2, "mar":3, "apr":4, "jun":6, "jul":7, "aug":8, "sep":9, "oct":10, "nov":11, "dec":12
    }
    # ukloni sufikse poput "st", "nd", "rd", "th"
    clean_str = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_str.lower())
    # tražimo uzorak "29 march 2024", "1 jan 2023" itd.
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

def parse_ura_text(ocr_text: str) -> dict:
    parsed_data = {}
    client = SudregClient()

    try:
        supplier_info = extract_supplier_info(ocr_text)
        parsed_data.update(supplier_info)

        # Dohvat dodatnih podataka iz Sudskog registra ako OIB postoji
        sudreg_data, _ = client.get_company_by_oib(supplier_info['oib'])
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

    lines = ocr_text.splitlines()
    invoice_date = None
    due_date = None

    for i, line in enumerate(lines):
        line_lower = line.lower()

        if any(k in line_lower for k in invoice_keys):
            for j in range(1, 4):
                if i + j < len(lines):
                    text_to_check = lines[i + j]
                    # prvo hrvatski datum
                    dt = parse_croatian_date(text_to_check)
                    if dt:
                        invoice_date = dt
                        break
                    # zatim engleski datum
                    dt = parse_english_date(text_to_check)
                    if dt:
                        invoice_date = dt
                        break
                    # ako nema tekstualnog, probaj numerički
                    matches = date_pattern_numeric.findall(text_to_check)
                    if matches:
                        try:
                            date_str = matches[0].replace("/", ".")
                            invoice_date = datetime.strptime(date_str, "%d.%m.%Y").date()
                            break
                        except Exception:
                            continue

        if any(k in line_lower for k in due_keys):
            for j in range(1, 4):
                if i + j < len(lines):
                    text_to_check = lines[i + j]
                    dt = parse_croatian_date(text_to_check)
                    if dt:
                        due_date = dt
                        break
                    dt = parse_english_date(text_to_check)
                    if dt:
                        due_date = dt
                        break
                    matches = date_pattern_numeric.findall(text_to_check)
                    if matches:
                        try:
                            date_str = matches[0].replace("/", ".")
                            due_date = datetime.strptime(date_str, "%d.%m.%Y").date()
                            break
                        except Exception:
                            continue

    parsed_data["invoice_date"] = str(invoice_date) if invoice_date else None
    parsed_data["due_date"] = str(due_date) if due_date else None

    return parsed_data
