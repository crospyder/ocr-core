// #SearchPage.jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ db_results: [], es_results: [] });
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.warning("Molimo unesite pojam za pretragu!");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get("/api/search/", { params: { query } });
      const { db_results, es_results } = response.data;
      if (db_results.length === 0 && es_results.length === 0) {
        toast.info("Nema rezultata za pretragu.");
      } else {
        toast.success(`Pronađeno ${db_results.length + es_results.length} rezultata.`);
      }
      setResults({ db_results, es_results });
    } catch (error) {
      toast.error("Došlo je do pogreške prilikom pretrage.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const dateObj = new Date(dateStr);
    return `${String(dateObj.getDate()).padStart(2, "0")}/${String(
      dateObj.getMonth() + 1
    ).padStart(2, "0")}/${String(dateObj.getFullYear()).slice(2)}`;
  };

  return (
    <div className="container mt-2 mb-2">
      <div className="card card-compact shadow p-3 mb-3">
        <div className="d-flex flex-column flex-md-row align-center justify-between gap-2 mb-3">
          <h2 className="fw-bold mb-2 page-title">Pretraži dokumente</h2>
          <div className="d-flex gap-1 w-100" style={{ maxWidth: 470 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Unesite pojam za pretragu"
              className="form-control"
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-warning fw-bold"
              onClick={handleSearch}
              disabled={loading}
              style={{ minWidth: 120 }}
            >
              {loading ? "Pretraga..." : "Pretraži"}
            </button>
          </div>
        </div>
        <div className="text-muted mb-3 small">
          <strong>Napredno:</strong>
          <span className="ms-1">
            Navodnici <code style={{ color: "#ea3c52", background: "#fbe7ea" }}>"točan tekst"</code>,
          </span>
          <span className="ms-1">plus <code>+</code> (obavezna riječ),</span>
          <span className="ms-1">minus <code>-</code> (isključi riječ),</span>
          <span className="ms-1">zvjezdica <code>*</code> (wildcard).</span>
        </div>
        <div className="dashboard-grid">
          {/* Rezultati iz baze */}
          <div>
            <div className="card card-compact p-2 mb-2">
              <h6 className="mb-3 fw-bold">Rezultati iz baze</h6>
              {results.db_results.length === 0 && (
                <div className="text-muted p-2">Nema rezultata u bazi.</div>
              )}
              {results.db_results.map((doc) => (
                <div key={doc.id} className="db-result-item">
                  <div className="db-result-date">{formatDate(doc.archived_at)}</div>
                  <div className="db-result-content">
                    <span className={`doc-tag ${doc.document_type?.toLowerCase() || ""}`}>
                      {doc.document_type}
                    </span>
                    <span className="partner-label">Partner:</span>
                    <span className="partner-name">{doc.supplier_name_ocr || "-"}</span>
                    <Link to={`/documents/${doc.id}`} className="btn btn-secondary btn-xs btn-view">
                      Pregledaj
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Rezultati iz Elasticsearcha */}
          <div>
            <div className="card card-compact p-2 mb-2">
              <h6 className="mb-3 fw-bold">Rezultati iz Elasticsearcha</h6>
              {results.es_results.length === 0 && (
                <div className="text-muted p-2">Nema rezultata u Elasticsearchu.</div>
              )}
              {results.es_results.map((doc, idx) => (
                <div key={doc.id || idx} className="db-result-item">
                  <div className="db-result-date">{formatDate(doc.archived_at)}</div>
                  <div className="db-result-content es-result-content">
                    <span className="partner-label">Partner:</span>
                    <span className="partner-name">{doc.supplier_name_ocr || "-"}</span>
                    {doc.id && (
                      <Link to={`/documents/${doc.id}`} className="btn btn-secondary btn-xs btn-view">
                        Pregledaj
                      </Link>
                    )}
                  </div>
                  <div className="es-result-snippet small">
                    {doc.ocrresult ? (doc.ocrresult.length > 250 ? doc.ocrresult.slice(0, 250) + "..." : doc.ocrresult) : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
