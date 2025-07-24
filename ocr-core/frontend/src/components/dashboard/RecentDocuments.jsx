import React, { useEffect, useState } from "react";

export default function RecentDocuments() {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents?processed=true&page=1&page_size=20&order=desc");
        if (!res.ok) throw new Error("Greška pri dohvaćanju dokumenata");
        const data = await res.json();

        if (data && Array.isArray(data.items)) {
          setDocuments(data.items);
        } else {
          setDocuments([]);
        }
      } catch (err) {
        console.error(err);
        setDocuments([]);
      }
    }
    fetchDocs();
  }, []);

  const renderTag = (type) => {
    const label = type || "Nepoznato";
    const cssClass = type ? `doc-tag ${type.toLowerCase()}` : "doc-tag";
    return <span className={cssClass}>{label}</span>;
  };

  const isDocumentsEmpty = !Array.isArray(documents) || documents.length === 0;

  return (
    <div className="recent-documents-widget card">
      <div className="card-body">
        {isDocumentsEmpty ? (
          <p className="text-muted small">Nema podataka za prikaz.</p>
        ) : (
          <>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="recent-doc-item d-flex align-center justify-between mb-1"
              >
                <a
                  href={`/documents/${doc.id}`}
                  className="doc-link recent-doc-filename"
                  title={doc.filename}
                >
                  {doc.filename && doc.filename.length > 50
                    ? doc.filename.slice(0, 50) + "..."
                    : doc.filename}
                </a>
                <div className="text-muted small d-flex align-center gap-2 recent-doc-meta">
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
