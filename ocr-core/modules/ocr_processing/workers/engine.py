import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import os

def convert_pdf_to_images(pdf_path):
    doc = fitz.open(pdf_path)
    images = []
    for page in doc:
        pix = page.get_pixmap(dpi=300)
        img_path = f"{pdf_path}_{page.number}.png"
        pix.save(img_path)
        images.append(Image.open(img_path))
    return images

def perform_ocr(file_path):
    temp_images_paths = []
    if file_path.lower().endswith(".pdf"):
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

    # Obriši privremene slike
    for temp_img_path in temp_images_paths:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

    return result_text
