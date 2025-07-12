import re

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

def extract_oib(text: str) -> str | None:
    pattern = r"\b[0-9]{11}\b"
    matches = re.findall(pattern, text)
    if not matches:
        return None
    return matches[0]

def extract_invoice_date(text: str) -> str | None:
    date_pattern = r"VRIJEME IZDAVANJA:\s*(\d{2}\.\d{2}\.\d{4})"
    match = re.search(date_pattern, text)
    if match:
        return match.group(1)
    return None
