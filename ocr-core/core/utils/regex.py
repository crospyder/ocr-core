import re
import logging

logger = logging.getLogger(__name__)

DOC_NUMBER_PATTERNS = [
    r"\b\d{1,5}[-/]\w+[-/]\d{1,5}\b",  # npr. 98/4505-2 ili 1345/MP1/100
    r"\bBR[-\s]?(\d{1,10})\b",
    r"\bUG[-\s]?(\d{1,10})\b",
    r"\bRAČUN[-\s]?(\d{1,10})\b",
    r"\bBROJ[-\s]?(\d{1,10})\b",
]

def extract_doc_number(text: str) -> str | None:
    for pattern in DOC_NUMBER_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return None

OIB_PATTERN = r"\b[0-9]{11}\b"

def extract_oib(text: str) -> str | None:
    matches = re.findall(OIB_PATTERN, text)
    if not matches:
        return None
    return matches[0]

# Pravila za VAT brojeve po zemljama, patterni za validaciju
COUNTRY_VAT_REGEX = {
    "AT": r"ATU\d{8}",
    "BE": r"BE0\d{9}",
    "BG": r"BG\d{9,10}",
    "CY": r"CY\d{8}[A-Z]",
    "CZ": r"CZ\d{8,10}",
    "DK": r"DK\d{8}",
    "EE": r"EE\d{9}",
    "FI": r"FI\d{8}",
    "FR": r"FR[A-Z0-9]{2}\d{9}",
    "EL": r"EL\d{9}",
    "HR": r"HR\d{11}",
    "IE": r"IE\d{7}[A-W]|IE\d[A-Z0-9]\d{5}[A-W]",  # složeno za irsku
    "IT": r"IT\d{11}",
    "LV": r"LV\d{11}",
    "LT": r"LT(\d{9}|\d{12})",
    "LU": r"LU\d{8}",
    "HU": r"HU\d{8}",
    "MT": r"MT\d{8}",
    "NL": r"NL\d{9}B\d{2}",
    "DE": r"DE\d{9}",
    "PL": r"PL\d{10}",
    "PT": r"PT\d{9}",
    "RO": r"RO\d{2,10}",
    "SK": r"SK\d{10}",
    "SI": r"SI\d{8}",
    "ES": r"ES[A-Z0-9]\d{7}[A-Z0-9]",
    "SE": r"SE\d{12}",
}

# Modificirani pattern koji može prepoznati razmake između country code, brojeva i sufiksa
VAT_CANDIDATE_PATTERN = r"\b([A-Z]{2})\s*(\d+)\s*([A-Z]?)\b"

def extract_vat_number(text: str) -> str | None:
    candidates = re.findall(VAT_CANDIDATE_PATTERN, text.upper())
    logger.info(f"Pronađeni kandidati za VAT broj (raw): {candidates}")

    for country_code, number, suffix in candidates:
        candidate = f"{country_code}{number}{suffix}"
        pattern = COUNTRY_VAT_REGEX.get(country_code)

        if not pattern:
            logger.debug(f"Nema pravila za zemlju {country_code} za VAT broj {candidate}, preskačem.")
            continue

        if re.fullmatch(pattern, candidate):
            logger.info(f"Validan VAT broj pronađen: {candidate}")
            return candidate
        else:
            logger.debug(f"Nevalidan VAT broj za zemlju {country_code}: {candidate}")

    return None

def extract_all_vats(text: str) -> list[str]:
    """
    Izvlači sve validne VAT brojeve iz teksta (lista),
    koristi isti pattern i pravila kao extract_vat_number.
    """
    raw_candidates = re.findall(VAT_CANDIDATE_PATTERN, text.upper())
    vats = []
    for country_code, number, suffix in raw_candidates:
        candidate = f"{country_code}{number}{suffix}"
        regex = COUNTRY_VAT_REGEX.get(country_code)
        if regex and re.fullmatch(regex, candidate):
            vats.append(candidate)
    return vats

# Datum računa, primjer: "VRIJEME IZDAVANJA: 12.02.2025"
def extract_invoice_date(text: str) -> str | None:
    date_pattern = r"VRIJEME IZDAVANJA:\s*(\d{2}\.\d{2}\.\d{4})"
    match = re.search(date_pattern, text)
    if match:
        return match.group(1)
    return None
