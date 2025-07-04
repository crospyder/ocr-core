import re

OWN_OIB = "10238889600"  # tu stavi svoj stvarni OIB

def extract_supplier_info(text: str) -> dict:
    """
    Ekstrahira naziv firme, OIB, adresu iz OCR teksta.
    Firma mora imati sufiks d.o.o., j.d.o.o. ili prefiks obrt.
    OIB je obavezan.
    """

    # Pronađi sve OIB-ove (11 znamenki)
    all_oibs = re.findall(r"\b(\d{11})\b", text)
    
    # Ignoriraj vlastiti OIB i uzmi prvi drugi OIB (dobavljača)
    oib = None
    for found_oib in all_oibs:
        if found_oib != OWN_OIB:
            oib = found_oib
            break

    # Pronađi naziv firme
    firma_match = re.search(r"([A-ZČĆŽŠĐ][A-ZČĆŽŠĐa-zčćžšđ0-9 &\"\'\-]+(?:d\.o\.o\.|j\.d\.o\.o\.))", text)
    if not firma_match:
        firma_match = re.search(r"(obrt\s+[A-ZČĆŽŠĐa-zčćžšđ0-9 \-]+)", text, re.IGNORECASE)
    naziv_firme = firma_match.group(1).strip() if firma_match else None

    # Pronađi adresu – grubi pristup, linija nakon naziva firme
    adresa = None
    if naziv_firme:
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if naziv_firme in line and i+1 < len(lines):
                potencijalna = lines[i+1].strip()
                if any(word in potencijalna.lower() for word in ["ul.", "ulica", "bb", "trg", "avenija", "naselje", "put", "br", "broj"]):
                    adresa = potencijalna
                break

    return {
        "oib": oib,
        "naziv_firme": naziv_firme,
        "adresa": adresa
    }
