from fastapi import APIRouter

router = APIRouter()

@router.get("/logs")
def get_logs():
    try:
        with open("uvicorn.log", "r") as f:
            lines = f.readlines()[-50:]  # zadnjih 50 linija
        return {"logs": lines}
    except Exception as e:
        return {"logs": [f"⚠️ Greška pri čitanju logova: {str(e)}"]}
