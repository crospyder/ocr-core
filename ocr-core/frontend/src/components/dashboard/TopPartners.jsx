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

  if (partners.length === 0) {
    return (
      <div className="card card-compact">
        <div className="card-body text-muted small">Nema podataka za prikaz.</div>
      </div>
    );
  }

  return (
    <div className="card card-compact h-100">
      <div className="card-body p-3">
        <ul className="list-unstyled mb-0">
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
