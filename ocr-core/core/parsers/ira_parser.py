from core.parsers.invoice_parser import parse_invoice_text

def parse_ura_text(ocr_text: str) -> dict:
    return parse_invoice_text(ocr_text)

def parse_ira_text(ocr_text: str) -> dict:
    return parse_invoice_text(ocr_text)
