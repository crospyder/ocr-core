import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ClientInfoView() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/client/info")
      .then((res) => {
        setClient(res.data);
      })
      .catch(() => {
        toast.error(
          "Sustav nije konfiguriran. Molimo uploadajte JSON datoteku s podacima o klijentu u sljedećem formatu:\n\n" +
          `{
  "naziv_firme": "",
  "oib": "",
  "adresa": "",
  "kontakt_osoba": "",
  "email": "",
  "telefon": "",
  "broj_seatova": ""
}`
        );
        setClient(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return null; // dok se učitava, ništa ne prikazujemo

  // Ako treba setup, prikaži disclaimer s uputama (bez toast)
  if (client?.needs_setup) {
    return (
      <div className="alert alert-warning mt-3" role="alert" style={{ whiteSpace: "pre-wrap" }}>
        {client.message}
      </div>
    );
  }

  // Inače, prikaži podatke o klijentu
  if (client && !client.needs_setup) {
    return (
      <div className="card mt-4">
        <div className="card-header">Licencirani korisnik</div>
        <div className="card-body">
          <p><strong>Naziv:</strong> {client.naziv_firme}</p>
          <p><strong>OIB:</strong> {client.oib}</p>
          <p><strong>Adresa:</strong> {client.adresa}</p>
          <p><strong>Kontakt osoba:</strong> {client.kontakt_osoba}</p>
          <p><strong>Email:</strong> {client.email}</p>
          <p><strong>Telefon:</strong> {client.telefon}</p>
        </div>
      </div>
    );
  }

  // Fallback, ako slučajno ništa nije zadano
  return null;
}
