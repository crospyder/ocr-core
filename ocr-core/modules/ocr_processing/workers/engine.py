import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import os
import re
from modules.sudreg_api.client import SudregClient

sudreg_client = SudregClient()

def extract_text_from_pdf_native(pdf_path) -> str:
    """Pokušaj izdvojiti native tekst iz PDF-a."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        text = page.get_text()
        full_text += text + "\n"
    return full_text.strip()

def perform_ocr(file_path):
    temp_images_paths = []
    if file_path.lower().endswith(".pdf"):
        # Prvo pokušaš native tekst iz PDF-a
        native_text = extract_text_from_pdf_native(file_path)
        if native_text and len(native_text) > 100:  # prag za minimalnu dužinu
            return native_text
        
        # fallback: OCR nad slikama iz PDF-a
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

    # Briši privremene slike
    for temp_img_path in temp_images_paths:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

    return result_text

def extract_oib(text: str) -> str | None:
    # OIB je 11 znamenki, pronalazi prvi takav niz
    pattern = r"\b[0-9]{11}\b"
    matches = re.findall(pattern, text)
    if not matches:
        return None
    # Opcionalno možeš dodati checksum validaciju OIB-a
    return matches[0]

def perform_ocr_and_get_supplier_info(file_path):
    text = perform_ocr(file_path)
    oib = extract_oib(text)
    supplier_info = None
    if oib:
        try:
            supplier_info = sudreg_client.get_company_by_oib(oib)
        except Exception as e:
            print(f"Greška u Sudreg API pozivu: {e}")

    return {
        "ocr_text": text,
        "supplier_oib": oib,
        "supplier_info": supplier_info.dict() if supplier_info else None,
    }
