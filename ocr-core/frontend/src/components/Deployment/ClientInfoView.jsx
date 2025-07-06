import { useEffect, useState } from "react";
import axios from "axios";

export default function ClientInfoView() {
  const [client, setClient] = useState(null);

  useEffect(() => {
    axios.get("/api/client/info").then((res) => {
      setClient(res.data);
    }).catch(() => {
      setClient(null);
    });
  }, []);

  if (!client) return <p className="text-muted">Podaci o klijentu nisu uneseni.</p>;

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
