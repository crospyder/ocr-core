import React, { useEffect, useState } from "react";
import DocumentCard from "../DocumentCard.jsx";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' ili 'grid'

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (!res.ok)
        throw new Error(
          "Ne mogu se povezati na SQL bazu, greška pri dohvatu dokumenata."
        );
      const data = await res.json();
      console.log("API documents data:", data);
      setDocuments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) return <p>Učitavanje dokumenata...</p>;
  if (error) return <p className="text-danger">Greška: {error}</p>;

  return (
    <div className="container mt-4">
      <h2 className="h3 mb-4 text-primary">
        Prethodno uploadani dokumenti obrađeni OCR-om
      </h2>

      {/* Toggle tipki za promjenu prikaza */}
      <div className="mb-3">
        <button
          className={`btn btn-sm me-2 ${
            viewMode === "list" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setViewMode("list")}
          aria-pressed={viewMode === "list"}
        >
          Lista
        </button>
        <button
          className={`btn btn-sm ${
            viewMode === "grid" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setViewMode("grid")}
          aria-pressed={viewMode === "grid"}
        >
          Grid
        </button>
      </div>

      {documents.length === 0 ? (
        <p>U bazi podataka nemamo dokumenata</p>
      ) : viewMode === "list" ? (
        <div className="list-group">
          {documents.map((doc) => (
            <div className="list-group-item" key={doc.id}>
              <DocumentCard
                id={doc.id}
                title={doc.filename}
                partner={doc.supplier?.naziv_firme || "Nepoznato"}
                date={
                  doc.date
                    ? new Date(doc.date).toLocaleDateString("hr-HR")
                    : "Nepoznat datum"
                }
                amount={
                  doc.amount
                    ? doc.amount.toLocaleString("hr-HR") + " kn"
                    : "-"
                }
                ocrSnippet={
                  doc.ocrresult
                    ? doc.ocrresult.slice(0, 150) +
                      (doc.ocrresult.length > 150 ? "..." : "")
                    : "-"
                }
                viewMode="list"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="row g-4">
          {documents.map((doc) => (
            <div className="col-12 col-md-6 col-lg-4" key={doc.id}>
              <DocumentCard
                id={doc.id}
                title={doc.filename}
                partner={doc.supplier?.naziv_firme || "Nepoznato"}
                date={
                  doc.date
                    ? new Date(doc.date).toLocaleDateString("hr-HR")
                    : "Nepoznat datum"
                }
                amount={
                  doc.amount
                    ? doc.amount.toLocaleString("hr-HR") + " kn"
                    : "-"
                }
                ocrSnippet={
                  doc.ocrresult
                    ? doc.ocrresult.slice(0, 70) +
                      (doc.ocrresult.length > 70 ? "..." : "")
                    : "-"
                }
                viewMode="grid"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
