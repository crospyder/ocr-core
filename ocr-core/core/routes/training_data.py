import os
import csv
import threading
import requests
import json

BATCH_DIR = "/tmp/training_batches"
BATCH_SIZE = 10
INFERENCE_SERVER_URL = "http://192.168.100.53:9000"  # update po potrebi

os.makedirs(BATCH_DIR, exist_ok=True)
BATCH_FILE = os.path.join(BATCH_DIR, "current_batch.csv")
METRICS_FILE = os.path.join(BATCH_DIR, "last_training_metrics.json")
batch_lock = threading.Lock()

def add_sample_to_batch(text, label):
    with batch_lock:
        write_header = not os.path.exists(BATCH_FILE)
        with open(BATCH_FILE, "a", newline='', encoding="utf-8") as f:
            writer = csv.writer(f)
            if write_header:
                writer.writerow(["text", "label"])
            writer.writerow([text, label])
        # Provjeri veličinu batcha
        with open(BATCH_FILE, "r", encoding="utf-8") as f:
            rows = list(csv.reader(f))
            if len(rows) - 1 >= BATCH_SIZE:
                send_and_clear_batch()

def send_and_clear_batch():
    with batch_lock:
        # Pošalji batch inference serveru
        with open(BATCH_FILE, "rb") as f:
            files = {"file": ("training_batch.csv", f, "text/csv")}
            r = requests.post(f"{INFERENCE_SERVER_URL}/api/new_training_data", files=files)
            r.raise_for_status()

        # Pokreni treniranje i dohvati metrike
        r2 = requests.post(f"{INFERENCE_SERVER_URL}/api/train_model")
        r2.raise_for_status()
        resp_json = r2.json()
        metrics = resp_json.get("metrics")
        if metrics:
            save_metrics(metrics)

        # Obriši batch file
        os.remove(BATCH_FILE)

def save_metrics(metrics: dict):
    with open(METRICS_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics, f)

def load_metrics():
    if os.path.exists(METRICS_FILE):
        with open(METRICS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None
