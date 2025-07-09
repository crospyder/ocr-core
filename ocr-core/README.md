# OCR System v0.3

Minimalni projekt za OCR backend i frontend.

## Setup

1. Kreiraj virtualno okruženje:
```bash
python3 -m venv venv
source venv/bin/activate
## pokreni Backend FastAPI iz foldera /ocr-core/
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug

## ako je potrebno dohvatiti sve pakete (SQLalchemy, Python itd)
pip freeze > requirements.txt
pip install > requirements.txt
test