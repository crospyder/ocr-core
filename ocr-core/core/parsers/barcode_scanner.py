from typing import Optional
from pdf2image import convert_from_path
from pyzbar.pyzbar import decode
from PIL import Image

def extract_barcode_data_from_pdf(pdf_path: str) -> Optional[str]:
    try:
        pages = convert_from_path(pdf_path, dpi=300)
        for idx, page in enumerate(pages):
            decoded_objs = decode(page)
            if decoded_objs:
                print(f"[QR] Detektirani kodovi na stranici {idx+1}")
                for obj in decoded_objs:
                    try:
                        decoded_data = obj.data.decode('utf-8')
                        print(f"[QR] → {decoded_data}")
                        return decoded_data
                    except Exception as e:
                        print(f"[QR] ⚠️ Greška dekodiranja koda: {e}")
        return None
    except Exception as e:
        print(f"[QR] ❌ Greška kod obrade PDF-a: {e}")
        return None
