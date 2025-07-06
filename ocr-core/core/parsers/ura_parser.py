import re
from datetime import datetime
from core.parsers.supplier_extractor import extract_supplier_info
from modules.sudreg_api.client import SudregClient


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

    # Parsiraj datume (npr. Datum računa i Datum valute)
    date_patterns = [
        r"(?i)(datum[^\n]{0,15}?računa|izdan|datum)[^\d]{0,10}(\d{2}\.\d{2}\.\d{4})",
        r"(?i)(valuta|rok[^\n]{0,10}?plaćanja)[^\d]{0,10}(\d{2}\.\d{2}\.\d{4})",
    ]

    invoice_date = None
    due_date = None

    for line in ocr_text.splitlines():
        for pattern in date_patterns:
            match = re.search(pattern, line)
            if match:
                label, date_str = match.groups()
                try:
                    parsed_date = datetime.strptime(date_str, "%d.%m.%Y").date()
                    if "valut" in label.lower() or "rok" in label.lower():
                        due_date = parsed_date
                    else:
                        invoice_date = parsed_date
                except:
                    continue

    parsed_data["invoice_date"] = str(invoice_date) if invoice_date else None
    parsed_data["due_date"] = str(due_date) if due_date else None

    return parsed_data
