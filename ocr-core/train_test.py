import requests

url = "http://192.168.100.53:9000/classify"

payload = {
    "text": "Ovo je test OCR teksta",
    "candidate_labels": ["IZVOD", "UGOVOR", "URA", "IRA", "OSTALO"]
}

response = requests.post(url, json=payload)

if response.ok:
    print("Rezultat klasifikacije:")
    print(response.json())
else:
    print(f"Greška: {response.status_code} - {response.text}")
