// PartnerDocuments.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function PartnerDocuments() {
  const { oib } = useParams();
  const [documents, setDocuments] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingPartner, setLoadingPartner] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch(`/api/documents/by-oib/${oib}`);
        if (!res.ok) throw new Error("Greška pri dohvatu dokumenata za partnera.");
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDocs(false);
      }
    }
    async function fetchPartner() {
      try {
        const res = await fetch(`/api/partneri/${oib}`);
        if (!res.ok) throw new Error("Greška pri dohvatu podataka partnera.");
        const data = await res.json();
        setPartner(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPartner(false);
      }
    }
    fetchDocuments();
    fetchPartner();
  }, [oib]);

  if (loadingDocs || loadingPartner) return <div className="text-center py-4">Učitavanje...</div>;

  return (
    <div className="container mt-2" style={{ display: "flex", gap: 24 }}>
      {/* Lijevi stupac - Podaci partnera */}
      <div style={{ flex: "0 0 300px", borderRight: "1px solid #ddd", paddingRight: 20 }}>
        <h4>Podaci partnera</h4>
        {partner ? (
          <>
            <p><b>Naziv:</b> {partner.naziv}</p>
            <p><b>OIB:</b> {partner.oib}</p>
            <p><b>Adresa:</b> {partner.adresa}</p>
            <p><b>Telefon:</b> {partner.kontakt_telefon}</p>
            <p><b>Email:</b> {partner.kontakt_email}</p>
            <p><b>Kontakt osoba:</b> {partner.kontakt_osoba}</p>
          </>
        ) : (
          <p>Podaci nisu dostupni.</p>
        )}
      </div>

      {/* Desni stupac - Lista dokumenata */}
      <div style={{ flex: 1 }}>
        <h4 className="fw-bold mb-3 page-title">
          📎 Dokumenti za partnera: <span className="text-primary">{partner?.naziv || "Nepoznat partner"}</span> <span className="text-muted">({oib})</span>
        </h4>
        {documents.length === 0 ? (
          <div className="text-muted py-3">Nema dokumenata za ovog partnera.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-custom w-100">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Datum</th>
                  <th>Naziv</th>
                  <th>Tip</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.id}</td>
                    <td>{doc.date ? new Date(doc.date).toLocaleDateString("hr-HR") : "-"}</td>
                    <td>
                      <Link to={`/documents/${doc.id}`} className="fw-bold" style={{ color: "#1976d2" }}>
                        {doc.filename}
                      </Link>
                    </td>
                    <td>
                      <span className="doc-tag">{doc.document_type}</span>
                    </td>
                    <td>
                      <a
                        href={`/api/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-xs btn-outline-secondary"
                      >
                        Otvori
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to="/documents" className="btn btn-secondary mt-3">
          ← Natrag na sve dokumente
        </Link>
      </div>
    </div>
  );
}
