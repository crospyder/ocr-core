// src/components/pages/PartnerDocuments.jsx
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

  if (loading) return <p>Učitavanje...</p>;

  return (
    <div className="container mt-4">
      <h4 className="mb-3">📎 Dokumenti za partnera: <strong>{partnerName} ({oib})</strong></h4>
      {documents.length === 0 ? (
        <p>Nema dokumenata za ovog partnera.</p>
      ) : (
        <table className="table table-sm table-striped">
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
                  <Link to={`/documents/${doc.id}`}>
                    {doc.filename}
                  </Link>
                </td>
                <td>{doc.document_type}</td>
                <td>
                  <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer">
                    Otvori
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Link to="/documents" className="btn btn-secondary mt-3">← Natrag na sve dokumente</Link>
    </div>
  );
}
