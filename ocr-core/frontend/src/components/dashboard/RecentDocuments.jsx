import React, { useEffect, useState } from "react";

const RecentDocuments = () => {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents?processed=true&limit=10&order=desc");
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
    <div className="recent-documents-widget">
      <h5>📄 Zadnjih 10 obrađenih</h5>
      {documents.length === 0 ? (
        <p className="text-muted">Nema podataka za prikaz.</p>
      ) : (
        documents.map((doc) => (
          <div key={doc.id} className="doc-item">
            <a href={`/documents/${doc.id}`} className="doc-link">
              {doc.filename.length > 50 ? doc.filename.slice(0, 50) + "..." : doc.filename}
            </a>
            <div className="doc-meta">
              {new Date(doc.date).toLocaleDateString("hr-HR")}
              {renderTag(doc.document_type)}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default RecentDocuments;
