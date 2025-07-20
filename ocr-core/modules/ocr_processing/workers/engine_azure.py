import requests
import time
import os

AZURE_ENDPOINT = os.environ.get("AZURE_CV_ENDPOINT", "https://spineic-computervision.cognitiveservices.azure.com/")
AZURE_KEY = os.environ.get("AZURE_CV_KEY", "7svcs81aWHrol4erH2IKDXhWKRbBQKbp2H6RpFbX0sTeUisljqUbJQQJ99BGAC5RqLJXJ3w3AAAFACOGGj40")

def perform_ocr_azure(file_path, language="hr"):
    analyze_url = f"{AZURE_ENDPOINT.rstrip('/')}/vision/v3.2/read/analyze"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/octet-stream"
    }
    params = {
        "language": language,
        "readingOrder": "natural"
    }
    with open(file_path, "rb") as f:
        data = f.read()
    response = requests.post(analyze_url, headers=headers, params=params, data=data)
    response.raise_for_status()

    operation_url = response.headers["Operation-Location"]
    # Poll for result
    for _ in range(30):  # max 30 sec
        result = requests.get(operation_url, headers={"Ocp-Apim-Subscription-Key": AZURE_KEY})
        result.raise_for_status()
        res_json = result.json()
        status = res_json["status"]
        if status == "succeeded":
            lines = []
            for page in res_json["analyzeResult"]["readResults"]:
                for line in page["lines"]:
                    lines.append(line["text"])
            return "\n".join(lines)
        elif status == "failed":
            raise Exception("Azure OCR failed")
        time.sleep(1)
    raise TimeoutError("Azure OCR operation timed out")
