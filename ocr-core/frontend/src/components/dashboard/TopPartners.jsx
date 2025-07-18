import React, { useEffect, useState } from "react";

<<<<<<< HEAD
const TopPartners = () => {
=======
export default function TopPartners() {
>>>>>>> 60dbd18 (Release verzija 0.5.0 - stabilna verzija mail_processing s rollbackom i zaštitom od duplikata)
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    async function fetchPartners() {
      try {
        const res = await fetch("/api/documents/top-partners");
        if (!res.ok) throw new Error("Greška pri dohvaćanju top partnera");
        const data = await res.json();
<<<<<<< HEAD
        setPartners(data);
=======
        setPartners(data.slice(0, 10)); // Top 10 partnera
>>>>>>> 60dbd18 (Release verzija 0.5.0 - stabilna verzija mail_processing s rollbackom i zaštitom od duplikata)
      } catch (err) {
        console.error(err);
      }
    }
    fetchPartners();
  }, []);

  return (
<<<<<<< HEAD
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
=======
    <div className="top-partners-widget card h-100">
      <div className="card-body">
        <h5 className="mb-3 page-title" style={{ color: "#232d39" }}>
          🧑‍🤝‍🧑 Top 10 partnera po broju dokumenata
        </h5>
        <ul className="list-unstyled">
          {partners.length === 0 && (
            <li className="text-muted">Nema podataka za prikaz.</li>
          )}
          {partners.map((p, i) => (
            <li
              key={i}
              className="d-flex justify-content-between align-items-center py-2 border-bottom"
              style={{ fontSize: "1.02rem", fontWeight: 500 }}
            >
              <span>
                {i + 1}. {p.partner}
              </span>
              <span
                className="badge rounded-pill"
                style={{
                  background: "#007bff",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "1rem",
                  minWidth: 36,
                  textAlign: "center",
                  letterSpacing: ".04em",
                }}
              >
                {p.document_count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
>>>>>>> 60dbd18 (Release verzija 0.5.0 - stabilna verzija mail_processing s rollbackom i zaštitom od duplikata)
