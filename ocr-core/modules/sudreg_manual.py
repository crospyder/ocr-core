import logging
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.orm import Session
from modules.sudreg_api.client import SudregClient
from core.database.session import get_db  # ispravno importaj iz session.py

router = APIRouter()
sudreg_client = SudregClient()
logger = logging.getLogger(__name__)

@router.get("/sudreg-manual-raw")
async def sudreg_manual_raw_search(
    oib: str = Query(..., min_length=11, max_length=11, description="OIB subjekta"),
    db: Session = Depends(get_db),
):
    try:
        raw_data = sudreg_client.get_company_raw_by_oib(oib)
        if "error" in raw_data:
            logger.info(f"Subjekt s OIB-om {oib} nije pronađen.")
            raise HTTPException(status_code=404, detail=raw_data["error"])
        logger.debug(f"Sudreg raw response za OIB {oib}: {raw_data}")
        return raw_data
    except Exception as e:
        logger.error(f"Greška u dohvaćanju raw podataka za OIB {oib}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Greška pri dohvaćanju podataka: {str(e)}")
