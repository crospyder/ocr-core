#!/bin/bash

# Definiraj naziv aplikacije i opis
NAZIV_APLIKACIJE="SpineICT DMS OCR-core"
OPIS="Glavni sustav za DMS, OCR i multitenant obradu dokumenata."
COPYRIGHT="© 2025 SpineICT Solutions d.o.o."
KONTAKT_EMAIL="support@spine-ict.hr"

# Dohvati trenutni GIT tag ili branch
if git describe --tags --exact-match > /dev/null 2>&1; then
    VERZIJA=$(git describe --tags --exact-match)
else
    VERZIJA=$(git rev-parse --short HEAD)
fi

# Dohvati ISO 8601 datum i vrijeme za build
ZADNJE_AZURIRANJE=$(date --iso-8601=seconds)

# Dohvati kratki hash GIT commita
BUILD_INFO=$(git rev-parse --short HEAD)

# Kreiraj version.json
cat > core/version.json << EOF
{
  "naziv_aplikacije": "$NAZIV_APLIKACIJE",
  "verzija": "$VERZIJA",
  "zadnje_azuriranje": "$ZADNJE_AZURIRANJE",
  "build_info": "$BUILD_INFO",
  "opis": "$OPIS",
  "copyright": "$COPYRIGHT",
  "kontakt_email": "$KONTAKT_EMAIL",
  "dodatno": {},
  "status": "active"
}
EOF

echo "version.json je generiran:"
cat core/version.json
