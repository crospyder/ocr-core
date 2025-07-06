from .ura_parser import parse_ura_text
from .ira_parser import parse_ira_text
from .izvod_parser import parse_izvod_text
from .ugovor_parser import parse_ugovor_text

def dispatch_parser(doc_type: str):
    if doc_type == "URA":
        return parse_ura_text
    elif doc_type == "IRA":
        return parse_ira_text
    elif doc_type == "IZVOD":
        return parse_izvod_text
    elif doc_type == "UGOVOR":
        return parse_ugovor_text
    else:
        raise ValueError(f"Nepoznata vrsta dokumenta: {doc_type}")
