import React, { useEffect, useState } from "react";

export default function RecentDocuments() {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents?processed=true&limit=15&order=desc");
        if (!res.ok) throw new Error("Greška pri dohvaćanju dokumenata");
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchDocs();
  }, []);

  const renderTag = (type) => {
    const label = type || "Nepoznato";
    const cssClass = type ? `doc-tag ${type.toLowerCase()}` : "doc-tag";
    return <span className={cssClass}>{label}</span>;
  };

  return (
    <div className="recent-documents-widget card">
      <div className="card-body">
        <h5 className="mb-3 page-title" style={{ color: "#232d39" }}>
          📄 Prikaz najnovijih dokumenata
        </h5>

        {documents.length === 0 ? (
          <p className="text-muted">Nema podataka za prikaz.</p>
        ) : (
          <>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="recent-doc-item d-flex align-items-center justify-content-between mb-2 flex-wrap"
              >
                <a
                  href={`/documents/${doc.id}`}
                  className="doc-link text-truncate fw-semibold"
                  style={{ maxWidth: "38%", color: "#1976d2" }}
                  title={doc.filename}
                >
                  {doc.filename.length > 50 ? doc.filename.slice(0, 50) + "..." : doc.filename}
                </a>

                <div
                  className="text-truncate text-secondary"
                  style={{ maxWidth: "32%", fontSize: "1rem" }}
                  title={doc.supplier_name_ocr || "Nepoznati dobavljač"}
                >
                  {doc.supplier_name_ocr || "Nepoznati dobavljač"}
                </div>

                <div className="text-muted small d-flex align-items-center gap-2" style={{ minWidth: "120px" }}>
                  <span>{doc.date ? new Date(doc.date).toLocaleDateString("hr-HR") : "-"}</span>
                  {renderTag(doc.document_type)}
                </div>
              </div>
            ))}

            <div className="text-end mt-3">
              <a href="/documents" className="footer-link small">
                Pregledaj sve dokumente &rarr;
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
