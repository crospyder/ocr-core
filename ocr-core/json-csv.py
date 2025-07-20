import json
import csv

# učitaj JSON iz fajla
with open("annotations_export.json", encoding="utf-8") as f:
    data = json.load(f)["data"]

# filtriraj i pripremi za CSV
filtered = []
for d in data:
    # preskoči ako su sva relevantna polja prazna ili null
    if not any(d.get(field) for field in ["document_type", "oib", "invoice_number", "date_invoice", "date_valute", "amount_total", "supplier_name", "partner_name"]):
        continue
    filtered.append({
        "document_type": d.get("document_type") or "",
        "oib": d.get("oib") or "",
        "invoice_number": d.get("invoice_number") or "",
        "date_invoice": d.get("date_invoice") or "",
        "date_valute": d.get("date_valute") or "",
        "amount_total": d.get("amount_total") or "",
        "supplier_name": d.get("supplier_name") or "",
        "partner_name": d.get("partner_name") or "",
        "document_id": d.get("document_id") or "",
    })

# zapiši u CSV
with open("export_cisti.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["document_type","oib","invoice_number","date_invoice","date_valute","amount_total","supplier_name","partner_name","document_id"])
    writer.writeheader()
    writer.writerows(filtered)
