import requests
import xml.etree.ElementTree as ET

class ViesClient:
    def __init__(self):
        # možeš ostaviti postojeći client ako trebaš
        pass

    def validate_vat(self, country_code: str, vat_number: str) -> dict:
        # Ovo možeš koristiti ako ti radi za standardne VAT brojeve bez dodatnih znakova
        # ili ostavi prazno i koristi samo ručni SOAP poziv dolje
        pass

    def call_vies_soap_api(self, country_code: str, vat_number: str) -> dict:
        xml_payload = f"""<?xml version="1.0" encoding="UTF-8"?>
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                          xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
           <soapenv:Header/>
           <soapenv:Body>
              <urn:checkVat>
                 <urn:countryCode>{country_code}</urn:countryCode>
                 <urn:vatNumber>{vat_number}</urn:vatNumber>
              </urn:checkVat>
           </soapenv:Body>
        </soapenv:Envelope>"""

        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "urn:ec.europa.eu:taxud:vies:services:checkVat/checkVat"
        }

        try:
            response = requests.post("http://ec.europa.eu/taxation_customs/vies/services/checkVatService",
                                     data=xml_payload, headers=headers, timeout=10)
            response.raise_for_status()
            root = ET.fromstring(response.content)
            ns = {'ns2': 'urn:ec.europa.eu:taxud:vies:services:checkVat:types'}
            result = root.find('.//ns2:checkVatResponse', ns)
            if result is None:
                return {"valid": False, "error": "No response from VIES"}

            valid = result.find('ns2:valid', ns).text == 'true'
            name = result.find('ns2:name', ns).text
            address = result.find('ns2:address', ns).text
            request_date = result.find('ns2:requestDate', ns).text

            return {
                "valid": valid,
                "name": name,
                "address": address,
                "request_date": request_date,
            }
        except Exception as e:
            return {
                "valid": False,
                "error": str(e),
            }
