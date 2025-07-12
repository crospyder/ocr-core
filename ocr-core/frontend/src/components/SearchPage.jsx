import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ db_results: [], es_results: [] });
  const [loading, setLoading] = useState(false);

  // Pokretanje pretrage
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

  // Enter pokreće pretragu
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="pantheon-search-container">
      <div className="pantheon-search-header d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 mb-4">
        <h2 className="fw-semibold mb-2 pantheon-search-title">
          Pretraži dokumente
        </h2>
        <div className="d-flex gap-2 pantheon-search-inputrow">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Unesite pojam za pretragu"
            className="form-control pantheon-search-input"
            autoFocus
          />
          <button
            className="btn btn-warning fw-bold pantheon-search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Pretraga..." : "Pretraži"}
          </button>
        </div>
      </div>
      <div className="pantheon-search-tips small mb-4">
        <strong>Napredno:</strong>
        <span className="ms-1">Navodnici <code className="pantheon-red">"točan tekst"</code>,</span>
        <span className="ms-1">plus <code>+</code> (obavezna riječ),</span>
        <span className="ms-1">minus <code>-</code> (isključi riječ),</span>
        <span className="ms-1">zvjezdica <code>*</code> (wildcard).</span>
      </div>
      <div className="row g-4">
        <div className="col-md-6">
          <div className="pantheon-card">
            <h6 className="mb-3 fw-bold pantheon-card-title">Rezultati iz baze</h6>
            {results.db_results.length === 0 && (
              <div className="text-muted p-2">Nema rezultata u bazi.</div>
            )}
            {results.db_results.map((doc) => (
              <div
                key={doc.id}
                className="pantheon-result-item d-flex justify-content-between align-items-center mb-2 p-3 rounded"
              >
                <div className="text-start" style={{ minWidth: 0 }}>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="pantheon-doc-link fw-bold"
                    title={doc.filename}
                  >
                    {doc.filename}
                  </Link>
                  <span className={`doc-tag ms-2 px-2 py-1 rounded-pill fw-medium pantheon-doc-tag`}>
                    {doc.document_type}
                  </span>
                  <div className="doc-meta small mt-1" style={{ color: "#546176" }}>
                    Dobavljač: <span style={{ color: "#1976d2" }}>{doc.supplier_name_ocr || "-"}</span>
                    {" | "}
                    Datum: {doc.archived_at?.substring(0, 10)}
                  </div>
                </div>
                <Link
                  to={`/documents/${doc.id}`}
                  className="btn btn-outline-secondary btn-sm pantheon-btn-outline"
                >
                  Prikaži
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="col-md-6">
          <div className="pantheon-card">
            <h6 className="mb-3 fw-bold pantheon-card-title">Rezultati iz Elasticsearcha</h6>
            {results.es_results.length === 0 && (
              <div className="text-muted p-2">Nema rezultata u Elasticsearchu.</div>
            )}
            {results.es_results.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="pantheon-result-item d-flex justify-content-between align-items-center mb-2 p-3 rounded"
              >
                <div className="text-start" style={{ minWidth: 0 }}>
                  <span className="pantheon-doc-link fw-bold" title={doc.filename}>
                    {doc.filename || "Dokument"}
                  </span>
                  <span className={`doc-tag ms-2 px-2 py-1 rounded-pill fw-medium pantheon-doc-tag`}>
                    {doc.document_type}
                  </span>
                  <div className="doc-meta small mt-1" style={{ color: "#546176" }}>
                    Dobavljač: <span style={{ color: "#1976d2" }}>{doc.supplier_name_ocr || "-"}</span>
                    {" | "}
                    Datum: {doc.archived_at?.substring(0, 10)}
                  </div>
                  <div className="doc-meta small mt-1" style={{ color: "#a3acba" }}>
                    {doc.ocrresult?.slice(0, 90)}
                    {doc.ocrresult && doc.ocrresult.length > 90 ? "..." : ""}
                  </div>
                </div>
                {doc.id && (
                  <Link
                    to={`/documents/${doc.id}`}
                    className="btn btn-outline-secondary btn-sm pantheon-btn-outline"
                  >
                    Prikaži
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
