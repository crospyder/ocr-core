# Changelog – OCR-Core

Sve važne promjene u ovom projektu dokumentirane su u ovom fajlu.

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
