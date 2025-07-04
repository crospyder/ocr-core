import re
from parsers.supplier_extractor import extract_supplier_info, MissingOIBError
from sudreg import get_company_info


def parse_ura_text(ocr_text: str) -> dict:
    parsed_data = {}

    try:
        supplier_info = extract_supplier_info(ocr_text)
        parsed_data.update(supplier_info)

        # Dohvat dodatnih podataka iz Sudskog registra ako OIB postoji
        sudreg_data = get_company_info(supplier_info['oib'])
        parsed_data['sudreg'] = sudreg_data

    except MissingOIBError as e:
        parsed_data['error'] = str(e)
        return parsed_data

    # Daljnji parsing URA računa (datumi, iznosi, broj računa, PDV...)
    # Ovo ostaje kao tvoja postojeća logika, dolje možeš umetnuti više parsiranja

    return parsed_data
