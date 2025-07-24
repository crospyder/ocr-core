// #PartnerDocuments.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function PartnerDocuments() {
  const { oib } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch(`/api/documents/by-oib/${oib}`);
        if (!res.ok) throw new Error("Greška pri dohvatu dokumenata za partnera.");
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0) {
          setPartnerName(data[0].supplier_name_ocr || "Nepoznat partner");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [oib]);

  if (loading) return <div className="text-center py-4">Učitavanje...</div>;

  return (
    <div className="container mt-2">
      <h4 className="fw-bold mb-3 page-title">
        📎 Dokumenti za partnera: <span className="text-primary">{partnerName}</span> <span className="text-muted">({oib})</span>
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
  );
}
