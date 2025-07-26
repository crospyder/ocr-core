from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from sqlalchemy import func, case

from core.database.connection import get_db
from core.database.models import Document

router = APIRouter(prefix="/dashboard/finances", tags=["dashboard"])


@router.get("/")
def get_financial_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    partner_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Document)

    if start_date:
        query = query.filter(Document.invoice_date >= start_date)
    if end_date:
        query = query.filter(Document.invoice_date <= end_date)
    if partner_id:
        query = query.filter(Document.supplier_id == partner_id)

    sums = query.with_entities(
        func.coalesce(func.sum(case((Document.document_type == "PRIHOD", Document.amount), else_=0)), 0).label("total_income"),
        func.coalesce(func.sum(case((Document.document_type == "RASHOD", Document.amount), else_=0)), 0).label("total_expense"),
    ).first()

    return {
        "total_income": float(sums.total_income),
        "total_expense": float(sums.total_expense),
    }
