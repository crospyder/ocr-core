import subprocess
import json
from datetime import datetime

VERSION_JSON_PATH = "core/version.json"

def get_git_tag():
    try:
        # Pokušaj dohvatiti tag ako postoji na HEAD-u
        tag = subprocess.check_output(["git", "describe", "--tags", "--exact-match"], stderr=subprocess.DEVNULL).decode().strip()
        return tag
    except subprocess.CalledProcessError:
        return None

def get_git_commit_hash():
    commit_hash = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"]).decode().strip()
    return commit_hash

def generate_version_json():
    tag = get_git_tag()
    verzija = tag if tag else get_git_commit_hash()
    zadnje_azuriranje = datetime.now().isoformat()
    
    version_data = {
        "naziv_aplikacije": "SpineICT DMS OCR-core",
        "verzija": verzija,
        "zadnje_azuriranje": zadnje_azuriranje,
        "build_info": get_git_commit_hash(),
        "opis": "Glavni sustav za DMS, OCR i multitenant obradu dokumenata.",
        "copyright": "© 2025 SpineICT Solutions d.o.o.",
        "kontakt_email": "support@spine-ict.hr",
        "dodatno": {},
        "status": "active"
    }

    with open(VERSION_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(version_data, f, ensure_ascii=False, indent=2)
    print(f"Generiran {VERSION_JSON_PATH}")

def git_add_commit_push():
    try:
        subprocess.check_call(["git", "add", VERSION_JSON_PATH])
        commit_msg = "Automatski update version.json iz skripte git-pohrana.py"
        subprocess.check_call(["git", "commit", "-m", commit_msg])
        subprocess.check_call(["git", "push"])
        print("Promjene commitane i pushane.")
    except subprocess.CalledProcessError as e:
        print("Git commit/push nije uspio ili nije bilo promjena:", e)

if __name__ == "__main__":
    generate_version_json()
    git_add_commit_push()
