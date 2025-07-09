## [v0.31] – 2025-07-09

### Dodano
- Polja `invoice_date` i `due_date` dodana u model `Document` (baza + backend schema).
- API `/api/documents/` i `/api/documents/{id}` prošireni za `invoice_date` i `due_date`.
- Datum se sada serializira kao ISO string (`YYYY-MM-DD`) u JSON odgovorima.

### Ispravljeno
- Ispravljen `NameError` za `date` import u `schemas/documents.py`.
- Pregled i potvrda ispravnog prikaza datuma u frontend sučelju.


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
# Changelog – OCR-Core
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

Sve važne promjene u ovom projektu dokumentirane su u ovom fajlu.
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


