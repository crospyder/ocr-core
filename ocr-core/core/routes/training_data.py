import os
import csv
import threading
import requests

BATCH_DIR = "/tmp/training_batches"
BATCH_SIZE = 10
INFERENCE_SERVER_URL = "http://INFERENCE_SERVER_IP:9000"

os.makedirs(BATCH_DIR, exist_ok=True)
BATCH_FILE = os.path.join(BATCH_DIR, "current_batch.csv")
batch_lock = threading.Lock()

def add_sample_to_batch(text, label):
    with batch_lock:
        # Dodaj sample
        write_header = not os.path.exists(BATCH_FILE)
        with open(BATCH_FILE, "a", newline='', encoding="utf-8") as f:
            writer = csv.writer(f)
            if write_header:
                writer.writerow(["text", "label"])
            writer.writerow([text, label])
        # Provjeri batch size
        with open(BATCH_FILE, "r", encoding="utf-8") as f:
            rows = list(csv.reader(f))
            if len(rows) - 1 >= BATCH_SIZE:
                send_and_clear_batch()

def send_and_clear_batch():
    # Pošalji batch inference serveru
    with open(BATCH_FILE, "rb") as f:
        files = {"file": ("training_batch.csv", f, "text/csv")}
        r = requests.post(f"{INFERENCE_SERVER_URL}/api/new_training_data", files=files)
        assert r.status_code == 200
    # Pokreni treniranje
    r2 = requests.post(f"{INFERENCE_SERVER_URL}/api/train_model")
    assert r2.status_code == 200
    # Obriši batch file
    os.remove(BATCH_FILE)
