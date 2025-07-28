from .faktura_parser import parse_faktura_text

def dispatch_parser(doc_type: str):
    return parse_faktura_text