from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse
import os
import subprocess
import re
import csv
import io

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "uvoz"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/uvoz/upload")
async def upload_uvoz_file(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"filename": file.filename}

@router.get("/uvoz/list")
def list_uploaded_files():
    files = []
    for fname in os.listdir(UPLOAD_DIR):
        fpath = os.path.join(UPLOAD_DIR, fname)
        if os.path.isfile(fpath):
            files.append({"name": fname, "size": os.path.getsize(fpath)})
    return JSONResponse(content=files)

@router.get("/uvoz/mdb_structure")
def get_mdb_structure(filename: str = Query(...)):
    mdb_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(mdb_path):
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    try:
        tables_output = subprocess.check_output(["mdb-tables", "-1", mdb_path], text=True)
        tables = [t.strip() for t in tables_output.strip().split('\n') if t.strip()]
        cols_output = subprocess.check_output(["mdb-schema", mdb_path, "mysql"], text=True)

        result = []
        for tab in tables:
            tab_re = re.compile(rf"CREATE TABLE `{re.escape(tab)}` \((.*?)\);", re.S)
            match = tab_re.search(cols_output)
            columns = []
            if match:
                col_lines = [line.strip() for line in match.group(1).split(",\n")]
                for line in col_lines:
                    parts = line.split()
                    if parts and parts[0].startswith("`"):
                        col_name = parts[0].replace("`", "")
                        col_type = parts[1] if len(parts) > 1 else ""
                        columns.append({"name": col_name, "type": col_type})
            result.append({"table": tab, "columns": columns})
        return JSONResponse(content={"tables": result})
    except Exception as ex:
        return JSONResponse(content={"error": str(ex)}, status_code=500)

@router.get("/uvoz/preview")
def preview_table(filename: str = Query(...), table: str = Query(...)):
    mdb_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(mdb_path):
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    try:
        result = subprocess.run(
            ["mdb-export", mdb_path, table],
            capture_output=True, text=True, check=True
        )
        output = result.stdout
        reader = csv.DictReader(io.StringIO(output))
        rows = []
        for i, row in enumerate(reader):
            if i >= 10:
                break
            rows.append(row)
        return {"rows": rows}
    except Exception as ex:
        return JSONResponse(content={"error": str(ex)}, status_code=500)
