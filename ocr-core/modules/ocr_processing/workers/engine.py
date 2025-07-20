import os
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

# Ako trebaš još engine-a, importaj ovdje:
try:
    from .engine_azure import perform_ocr_azure
except ImportError:
    perform_ocr_azure = None  # fallback ako netko obriše file

# ---------- DEFAULT ENGINE (native + Tesseract) ----------
def extract_text_from_pdf_native(pdf_path) -> str:
    """Pokušaj izdvojiti native tekst iz PDF-a."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        text = page.get_text()
        full_text += text + "\n"
    return full_text.strip()

def perform_ocr_default(file_path):
    temp_images_paths = []
    if file_path.lower().endswith(".pdf"):
        native_text = extract_text_from_pdf_native(file_path)
        if native_text and len(native_text) > 100:
            return native_text

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

    result_text = ""
    for img in images:
        text = pytesseract.image_to_string(img, lang="hrv", config="--oem 1 --psm 6")
        result_text += text + "\n"

    for temp_img_path in temp_images_paths:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

    return result_text

# ---------- MODULAR ENGINE WRAPPER ----------
def perform_ocr(file_path, engine=None):
    """
    Plug&Play wrapper: biraj OCR engine ("azure", "default", ...)
    engine: string ili None (ako None, čita iz ENV var OCR_ENGINE)
    """
    if engine is None:
        engine = os.environ.get("OCR_ENGINE", "default")

    if engine == "azure":
        if perform_ocr_azure is not None:
            return perform_ocr_azure(file_path)
        else:
            print("Azure OCR engine not available, falling back to default.")
            return perform_ocr_default(file_path)
    # Add more engines here (easyocr, google, aws, ...)
    # elif engine == "easyocr":
    #     return perform_ocr_easyocr(file_path)
    else:
        # fallback na lokalni (default)
        return perform_ocr_default(file_path)

# ---------- BACKWARD-COMPATIBLE EKSTRAKCIJE ----------
# Helperi mogu ostati kakvi jesu ili modularizirati (po želji)
from modules.sudreg_api.client import SudregClient
from core.utils.regex import extract_oib, extract_invoice_date, extract_dates

sudreg_client = SudregClient()

def extract_oib(text: str) -> str | None:
    return extract_oib(text)

def extract_invoice_date(text: str) -> str | None:
    return extract_invoice_date(text)

def perform_ocr_and_get_supplier_info(file_path, engine=None):
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
