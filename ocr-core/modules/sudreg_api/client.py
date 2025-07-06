import os
import requests
from typing import Optional, Tuple, Union
from sqlalchemy.orm import Session
from .schemas import SudregCompany
from core.database.models import Client, ParsedOIB

CLIENT_ID = os.getenv("SUDREG_CLIENT_ID")
CLIENT_SECRET = os.getenv("SUDREG_CLIENT_SECRET")
TOKEN_URL = "https://sudreg-data.gov.hr/api/oauth/token"
LEGACY_BASE_URL = "https://sudreg-data.gov.hr/api/javni/v1"


class SudregClient:
    def __init__(self):
        self.token: Optional[str] = None

    def get_token(self) -> str:
        if self.token:
            return self.token
        response = requests.post(
            TOKEN_URL,
            data={"grant_type": "client_credentials"},
            auth=(CLIENT_ID, CLIENT_SECRET)
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            raise RuntimeError("Nije moguće dohvatiti OAuth token iz Sudreg API-ja")
        self.token = token
        return token

    def get_headers(self) -> dict:
        token = self.get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

    def get_company_by_oib(self, oib: str, db: Optional[Session] = None) -> Tuple[Optional[SudregCompany], dict]:
        # 1. Lokalna baza
        if db:
            client = db.query(Client).filter(Client.oib == oib).first()
            if client:
                company = SudregCompany(
                    oib=client.oib,
                    naziv=client.name,
                    adresa=None,
                    status=None,
                    datum_osnivanja=None,
                    djelatnost=None
                )
                return company, company.dict()

            parsed = db.query(ParsedOIB).filter(ParsedOIB.oib == oib).first()
            if parsed:
                company = SudregCompany(
                    oib=parsed.oib,
                    naziv=parsed.supplier_name,
                    adresa={"ulica_i_broj": parsed.supplier_address or ""},
                    status=None,
                    datum_osnivanja=parsed.created_at.date().isoformat(),
                    djelatnost=None
                )
                return company, company.dict()

        # 2. Sudreg API
        url = f"{LEGACY_BASE_URL}/subjekt_detalji"
        headers = self.get_headers()
        params = {"identifikator": oib, "tipIdentifikatora": "oib"}

        response = requests.get(url, headers=headers, params=params)

        # Ako nije pronađeno, spremi minimalni sadržaj
        if response.status_code == 404:
            return None, {
                "error": "Dobavljač nije pronađen u Sudregu",
                "oib": oib,
                "status_code": 404
            }

        # Baci grešku za sve druge nepredviđene statuse
        response.raise_for_status()
        data = response.json()

        mapped_data = {
            "oib": str(data.get("oib", "")),
            "naziv": None,
            "adresa": None,
            "status": None,
            "datum_osnivanja": data.get("datum_osnivanja"),
            "djelatnost": None
        }

        if isinstance(data.get("tvrtke"), list) and data["tvrtke"]:
            mapped_data["naziv"] = data["tvrtke"][0].get("ime")

        if isinstance(data.get("sjedista"), list) and data["sjedista"]:
            sj = data["sjedista"][0]
            mapped_data["adresa"] = {
                "ulica_i_broj": f'{sj.get("ulica", "")} {sj.get("kucni_broj", "")}'.strip(),
                "mjesto": sj.get("naziv_naselja"),
                "postanski_broj": None
            }

        return SudregCompany(**mapped_data), data
