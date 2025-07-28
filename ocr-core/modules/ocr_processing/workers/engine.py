import os
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

# ---------- PRO NATIVE: PDF blokovi sa x/y (layout aware!) ----------
def extract_text_blocks_from_pdf_native(pdf_path):
    """
    Vraća linije sortirane po Y, pa X, iz tekstualnih blokova PDF-a (PyMuPDF).
    Svaki blok: (y, x, text)
    """
    doc = fitz.open(pdf_path)
    lines = []
    for page in doc:
        blocks = page.get_text("blocks")  # svaki blok: (x0, y0, x1, y1, "text", ...)
        for block in blocks:
            x0, y0, x1, y1, text, *_ = block
            for line in text.splitlines():
                l = line.strip()
                if l:
                    lines.append((y0, x0, l))
    # Sortiraj linije po Y, onda po X
    sorted_lines = [l for _, _, l in sorted(lines, key=lambda t: (t[0], t[1]))]
    return "\n".join(sorted_lines), sorted_lines

# ---------- FALLBACK: OCR LAYOUT-AWARE (sort po Y pa X) ----------
def perform_ocr_default(file_path, return_lines=False):
    """
    OCR s layoutom: vraća tekst i linije strogo sortirane po Y, a unutar linije po X (vizualni redoslijed, blokovi).
    Ako return_lines=True, vraća tuple (plain_text, lista_linija).
    PNG-ovi se NE brišu automatski (za ručnu provjeru).
    """
    temp_images_paths = []
    all_lines = []

    if file_path.lower().endswith(".pdf"):
        # === PRO NATIVE: PDF blokovi sa x/y
        text_native, lines_native = extract_text_blocks_from_pdf_native(file_path)
        # Ako je dobar output (ima dovoljno teksta), koristi to!
        if text_native and len(text_native) > 100 and len(lines_native) > 3:
            return (text_native, lines_native) if return_lines else text_native

        # Ako nema text sloja ili premalo teksta, fallback na OCR PNG-ove...
        images = []
        doc = fitz.open(file_path)
        for page in doc:
            pix = page.get_pixmap(dpi=300)
            img_path = f"{file_path}_{page.number}.png"
            pix.save(img_path)
            temp_images_paths.append(img_path)
            images.append(Image.open(img_path))
    else:
        images = [Image.open(file_path)]

    for img in images:
        ocr_data = pytesseract.image_to_data(
            img, lang="hrv", config="--oem 1 --psm 6", output_type=pytesseract.Output.DICT
        )
        n = len(ocr_data['text'])
        # Mapiranje: (block, par, line, top) -> [(left, word)]
        lines_by_line_num = {}

        for i in range(n):
            word = ocr_data['text'][i]
            conf = ocr_data['conf'][i]
            block_num = ocr_data['block_num'][i]
            par_num = ocr_data['par_num'][i]
            line_num = ocr_data['line_num'][i]
            top = ocr_data['top'][i]
            left = ocr_data['left'][i]
            if word and word.strip() and str(conf).isdigit() and int(conf) > 10:
                key = (block_num, par_num, line_num, top)
                if key not in lines_by_line_num:
                    lines_by_line_num[key] = []
                lines_by_line_num[key].append((left, word))
        
        # Sortiraj linije po Y (top), blok, par, linija
        sorted_keys = sorted(lines_by_line_num.keys(), key=lambda k: (k[3], k[0], k[1], k[2]))
        for key in sorted_keys:
            # Unutar linije, sort po X (left)
            words = [w for _, w in sorted(lines_by_line_num[key], key=lambda t: t[0])]
            line = " ".join(words).strip()
            if line:
                all_lines.append(line)

    # PNG cleanup DISABLED! (ostaju za ručnu provjeru)
    # for temp_img_path in temp_images_paths:
    #     if os.path.exists(temp_img_path):
    #         os.remove(temp_img_path)

    final_lines = []
    for l in all_lines:
        l = l.strip()
        if l and (not final_lines or l != final_lines[-1]):
            final_lines.append(l)
    plain_text = "\n".join(final_lines)

    return (plain_text, final_lines) if return_lines else plain_text

# ---------- MODULAR ENGINE WRAPPER ----------
def perform_ocr(file_path, engine=None, return_lines=False):
    """
    Plug&Play wrapper: biraj OCR engine ("default", ...)
    engine: string ili None (ako None, čita iz ENV var OCR_ENGINE)
    Ako return_lines=True, svi enginei vraćaju tuple (plain_text, lines)
    """
    if engine is None:
        engine = os.environ.get("OCR_ENGINE", "default")

    # Samo jedan engine, fallback uvijek radi na perform_ocr_default
    return perform_ocr_default(file_path, return_lines=return_lines)

# ---------- BACKWARD-COMPATIBLE EKSTRAKCIJE ----------
from modules.sudreg_api.client import SudregClient
from core.utils.regex_common import extract_oib, extract_invoice_date, extract_dates

sudreg_client = SudregClient()

def extract_oib(text: str) -> str | None:
    return extract_oib(text)

def extract_invoice_date(text: str) -> str | None:
    return extract_invoice_date(text)

def perform_ocr_and_get_supplier_info(file_path, engine=None):
    # Backward kompatibilnost: koristi samo plain tekst, linije nisu bitne za ovu funkciju
    text = perform_ocr(file_path, engine=engine)
    oib = extract_oib(text)
    supplier_info = None
    if oib:
        try:
            supplier_info = sudreg_client.get_company_by_oib(oib)
        except Exception as e:
            print(f"Greška u Sudreg API pozivu: {e}")

    invoice_date = extract_invoice_date(text)

    return {
        "ocr_text": text,
        "supplier_oib": oib,
        "supplier_info": supplier_info.dict() if supplier_info else None,
        "invoice_date": invoice_date,
    }
