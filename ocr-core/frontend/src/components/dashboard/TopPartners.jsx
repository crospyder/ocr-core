import React, { useEffect, useState } from "react";

const TopPartners = () => {
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const res = await fetch("/api/documents/top-partners");
        if (!res.ok) throw new Error("Greška pri dohvaćanju top partnera");
        const data = await res.json();
        setPartners(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPartners();
  }, []);

  return (
    <div className="top-partners-widget bg-white p-3 rounded shadow-sm h-100">
      <h5>🧑‍🤝‍🧑 Top 5 partnera po broju dokumenata</h5>
      <ul className="list-unstyled">
        {partners.length === 0 && <li className="text-muted">Nema podataka za prikaz.</li>}
        {partners.map((p, i) => (
          <li key={i} className="d-flex justify-content-between py-1 border-bottom">
            <span>{p.partner}</span>
            <span className="badge bg-primary rounded-pill">{p.document_count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopPartners;
