// #TopPartners.jsx
import React, { useEffect, useState } from "react";

export default function TopPartners() {
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const res = await fetch("/api/documents/top-partners");
        if (!res.ok) throw new Error("Greška pri dohvaćanju top partnera");
        const data = await res.json();
        setPartners(data.slice(0, 20)); // Top 20 partnera
      } catch (err) {
        console.error(err);
      }
    }
    fetchPartners();
  }, []);

  return (
    <div className="top-partners-widget card h-100">
      <div className="card-body">
        <ul className="list-unstyled">
          {partners.length === 0 && (
            <li className="text-muted">Nema podataka za prikaz.</li>
          )}
          {partners.map((p, i) => (
            <li key={i} className="top-partner-item">
              <span>
                {i + 1}. {p.partner}
              </span>
              <span className="badge rounded-pill top-partner-badge">
                {p.document_count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
