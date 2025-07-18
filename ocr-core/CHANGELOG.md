# Changelog – Spine ICT Document management system

# Changelog – OCR-Core

## [v0.4.3] – 2025-07-12

### Dodano
- Implementiran API endpoint `/api/documents/top-partners` koji vraća top 5 partnera s najviše dokumenata.
- Dodan FastAPI ruta za dohvat top partnera s brojem dokumenata u `documents.py`.
- Frontend komponenta `TopPartners.jsx` za prikaz top 5 partnera na dashboardu.
- Poboljšan Dashboard layout, integrirane komponente RecentDocuments, DocumentStats i TopPartners.
- Uklonjen problem s HTTP 422 greškom na `/api/documents/top-partners` endpointu.
- Poboljšana paginacija u dokumentima, ispravljena logika za prikaz svih stranica.

### Ispravljeno
- Ispravljene greške u API-u prilikom dohvaćanja top partnera (nepodudaranje ruta i importi).
- Ispravljena provjera polja `ocrresult` u SQLAlchemy filterima (`isnot(None)`).
- Uklonjene duple i konfliktne rute za dokumente.
- Popravljena deklaracija rute i imports u `documents.py`.

### Ostalo
- Dodan početni koncept OAuth2 autentifikacije (plan i smjernice, nije implementirano).
- U CSS-u i UI komponentama dashboarda napravljene manje vizualne dorade.

---

# Sažetak za novi razgovor

### Trenutno stanje OCR-Core projekta

- Backend:
  - API `documents.py` sa svim ključnim funkcijama za rad s dokumentima.
  - Implementiran endpoint `/api/documents/top-partners` za dohvat top 5 partnera prema broju dokumenata.
  - FastAPI konfiguracija u `main.py` registrira sve potrebne rute.
- Frontend:
  - React dashboard koristi komponente `RecentDocuments`, `DocumentStats` i novu `TopPartners`.
  - Komponente komuniciraju s backendom putem REST API poziva.
- Pagination radi kako treba, problemi s nepostojećim API endpointima riješeni.
- Sljedeći veliki zadatak: implementacija OAuth2 autentifikacije s Microsoft i Google loginom (planirano, nije započeto).

---

Ako želiš, spremi ovo za početak novog razgovora, tako da nastavimo odavde s bilo kojim novim zadatkom bez gubitka konteksta.

Javi ako treba dodatno formatirati ili dodati detalje!


## [v0.4.2] – 2025-07-12

### Dodano
- Izvučen i spremljen broj dokumenta (broj računa/ugovora) iz OCR teksta.
- Preuređeni regex izrazi prebačeni u `core.utils.regex`.
- Refaktoriran `upload.py` za bolju čitljivost i održivost.
- Ažuriran `engine.py` s osnovnim OCR i parsiranjem OIB-a i datuma.
- Frontend `Documents.jsx` prikazuje stvarni broj dokumenta.
- Poboljšana Elasticsearch integracija i indeksiranje.
  
### Ispravljeno
- Ispravljena pogrešna ekstrakcija broja računa s lošim regexima.
- Održana kompatibilnost sa starim funkcionalnostima.

### Deployment
- Ručno dodan stupac `doc_number` u tablicu `documents`.
- Verzija tagirana kao `v0.4.2`.

## [v0.33] – 2025-07-09

### Dodano
- Backend logika: dokumenti sada prvo provjeravaju postoji li partner po OIB-u u tablici `partneri`, ako ne postoji – dohvaća se iz SudReg API-ja i sprema.
- Naziv partnera se sada koristi **isključivo u skracenom obliku** i zapisuje dosljedno u `documents` i `partneri` tablicu.
- Frontend: naziv dobavljača u `Documents.jsx` sada je klikabilan i vodi na `/documents/partner/{oib}` gdje se prikazuju svi dokumenti tog dobavljača.

### Ispravljeno
- Riješen problem gdje je kod drugog uploada istog partnera korišten puni naziv firme umjesto skraćenog.
- Ispravljeno imenovanje PDF-ova kad se koristi dugi naziv iz Sudrega.
- Popravljeno API filtriranje po OIB-u (route `/api/documents/by-oib/{oib}` vraća ispravne rezultate).

### Deployment
- Nema novih migracija ako `partneri` tablica već postoji.
- Verzija tagirana kao `v0.33`.

## [v0.32] – 2025-07-09

### Dodano
- Dinamičko imenovanje PDF datoteka prema dobavljaču i vrsti dokumenta (`nazivvrsta-00001.pdf`).
- Ako dokument nema valjan OIB ili se ne može identificirati, koristi se naziv `nepotpundokument-ura-00001.pdf`.
- Imenovanje koristi slugifikaciju (npr. `MICROLINE d.o.o.` → `microlinedoo`).
- Učitavanje podataka o vlasniku licence (klijenta) iz deployment `.json` datoteke za prepoznavanje domaćeg OIB-a.
- Frontend `Documents.jsx` sada prikazuje puni naziv PDF datoteke bez kraćenja.
- Dashboard prikazuje zadnjih 10 obrađenih dokumenata i detaljnu statistiku baze i diska.

### Promijenjeno
- `upload.py` koristi deployment klijentov OIB za prepoznavanje vlastitih računa i izbjegavanje zamjene vlasnika softvera za dobavljača.
- Statistika po vrstama dokumenata (`URA`, `IRA`, `UGOVOR`, `IZVOD`) dostupna unutar API `/stats-info`.

### Ispravljeno
- Problem s pogrešnim prikazom vlasnika softvera kao dobavljača kod nepoznatih dokumenata.
- Pravilno razgraničavanje validnih i nevalidnih dobavljača nakon OCR-a.
- Dupli prikazi komponenti na dashboardu uklonjeni, layout rasterećen i u skladu s vizualnim prototipom.

### Deployment
- Nema dodatnih migracija. Potrebno imati podatke o vlasniku softvera (klijentu) u bazi za ispravno funkcioniranje novog imenovanja.
- Verzija tagirana kao `v0.32`.

---

## [v0.31] – 2025-07-09

### Dodano
- Polja `invoice_date` i `due_date` dodana u model `Document` (baza + backend schema).
- API `/api/documents/` i `/api/documents/{id}` prošireni za `invoice_date` i `due_date`.
- Datum se sada serializira kao ISO string (`YYYY-MM-DD`) u JSON odgovorima.

### Ispravljeno
- Ispravljen `NameError` za `date` import u `schemas/documents.py`.
- Pregled i potvrda ispravnog prikaza datuma u frontend sučelju.

---

## [v0.30] – 2025-07-07

### Dodano
- Batch upload PDF-ova iz foldera s podrškom za odabir i jednog ili više fajlova.
- Modalni prikaz detalja prvog dokumenta nakon upload procesa.
- Poboljšana UX notifikacija i prikaz upozorenja za validacijske alerte.
- Proxy konfiguracija za frontend razvoj s backendom.
- Podrška za `invoice_date` i `due_date` u frontend prikazu dokumenata.

### Promijenjeno
- Refaktoriran `DocumentsUpload.jsx` za podršku upload foldera i pojedinačnih fajlova.
- `Upload.jsx` sada upravlja modalom i navigacijom nakon uspješnog uploada.
- Optimiziran proces prikaza upozorenja i grešaka kroz `react-toastify`.

### Ispravljeno
- Rješeni problemi s fetch errorima povezanim s OneDrive sinkronizacijom.
- Popravljeni edge case-ovi u odabiru i slanju datoteka za upload.

---

## [v0.29] – 2025-07-07

### Dodano
- Deployment modul: backend podrška za učitavanje i dohvat podataka o klijentu (`client_info.py`).
- Frontend komponenta `ClientInfoView.jsx`:
  - Prikaz podataka o klijentu u kartici.
  - Ako klijent nije unesen u bazu, prikazuje se tekstualna uputa tehničaru kako uploadati `.json` datoteku.
- Dodana `ToastContainer` notifikacija u `Layout.jsx` za sve podstranice (pozicionirana gore desno).

### Promijenjeno
- `GET /api/client/info` više ne baca `404` ako podataka nema, već vraća `needs_setup: true` i tekstualnu uputu.
- Prerađen fallback prikaz na frontend strani bez korištenja toast errora ako je baza prazna (prikaz upute samo u UI).

### Ispravljeno
- SQL greška `Unknown column 'archived_at'` u admin panelu (`users` tablica).
- UI rušenja i nestanak layout komponenata nakon toast integracije.

### Deployment
- Nema novih migracija osim inicijalne tablice `client_companies` (ako već nije kreirana).
- Verzija tagirana kao `v0.29`.

---

## [v0.28] – 2025-07-06

### Dodano
- Nova polja u tablicu `documents`: `invoice_date`, `due_date`, `parsed`.
- Logika za automatsko popunjavanje `due_date` s `invoice_date` kad fali rok plaćanja.
- Frontend upload komponenta s pregledom odabranih datoteka.
- React toast notifikacije za greške i uspješne uploade.
- JSON-safe serializacija `parsed_data` prije spremanja u bazu.
- Upozorenja ako Sudreg validacija ne uspije.

### Promijenjeno
- Pojačana obrada rezultata parsiranja (koristi `.dict()` ako je moguće).
- Bolja fallback logika za dobavljače kad Sudreg ne vraća podatke.

### Ispravljeno
- TypeError: Object of type SudregCompany is not JSON serializable.
- SQL greška: Unknown column 'parsed' in 'INSERT INTO'.
- SQL greška: Unknown column 'clients.invoice_date' in 'SELECT'.

### Deployment
- Potrebno ručno dodati stupce `invoice_date`, `due_date`, `parsed` u tablicu `documents` ako nisu automatski migrirani.
- Tagirano kao `v0.28`.
