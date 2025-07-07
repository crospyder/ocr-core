// src/components/pages/Documents.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [highlightIds, setHighlightIds] = useState([]);
  const [documentType, setDocumentType] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [stats, setStats] = useState({
    total_documents: 0,
    processed_documents: 0,
    total_pdf_size_mb: 0,
    free_space_mb: 0,
  });

  const location = useLocation();

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [documentType]);

  useEffect(() => {
    if (highlightIds.length > 0) {
      const timer = setTimeout(() => setHighlightIds([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightIds]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const query = documentType ? `?document_type=${encodeURIComponent(documentType)}` : "";
      const res = await fetch(`/api/documents/${query}`);
      if (!res.ok) throw new Error("Greška pri dohvatu dokumenata.");

      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
      setError(null);

      if (location.state?.justUploaded) {
        const ids = location.state.uploadedIds || data.slice(0, 5).map(doc => doc.id);
        setHighlightIds(ids);
      }
    } catch (err) {
      setError(err.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/documents/stats-info");
      if (!res.ok) throw new Error("Greška pri dohvatu statistike.");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedDocuments = useMemo(() => {
    const docs = [...documents];
    return docs.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (["date", "invoice_date", "due_date"].includes(sortConfig.key)) {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      return sortConfig.direction === "asc"
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
    });
  }, [documents, sortConfig]);

  const pageCount = Math.ceil(sortedDocuments.length / itemsPerPage);
  const paginatedDocs = useMemo(() => {
    if (itemsPerPage === -1) return sortedDocuments;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedDocuments.slice(start, start + itemsPerPage);
  }, [sortedDocuments, currentPage, itemsPerPage]);

  return (
    <div className="container mt-4">
      <div className="mb-4 p-3 bg-white shadow-sm rounded border">
        <h5 className="mb-2">📊 Statistika dokumenata</h5>
        <ul className="list-unstyled mb-0">
          <li><strong>Ukupno:</strong> {stats.total_documents}</li>
          <li><strong>Obrađeni (OCR):</strong> {stats.processed_documents}</li>
          <li><strong>PDF veličina:</strong> {stats.total_pdf_size_mb} MB</li>
          <li><strong>Slobodan prostor:</strong> {stats.free_space_mb} MB</li>
        </ul>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 text-primary mb-0">📁 OCR dokumenti</h2>
        <div className="d-flex gap-3 align-items-center">
          <select
            className="form-select form-select-sm"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="">Vrsta: Sve</option>
            <option value="URA">URA</option>
            <option value="IRA">IRA</option>
            <option value="UGOVOR">UGOVOR</option>
            <option value="IZVOD">IZVOD</option>
          </select>
          <select
            className="form-select form-select-sm"
            value={itemsPerPage}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          >
            <option value="10">10 / stranici</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="-1">Sve</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Učitavanje...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : paginatedDocs.length === 0 ? (
        <p>Nema dokumenata za prikaz.</p>
      ) : (
        <>
          <table className="table table-striped table-hover table-sm">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th style={{ cursor: "pointer" }} onClick={() => requestSort("filename")}>Naziv</th>
                <th onClick={() => requestSort("date")} style={{ cursor: "pointer" }}>Arhivirano</th>
                <th onClick={() => requestSort("supplier_name_ocr")} style={{ cursor: "pointer" }}>Dobavljač</th>
                <th onClick={() => requestSort("supplier_oib")} style={{ cursor: "pointer" }}>OIB</th>
                <th onClick={() => requestSort("invoice_date")} style={{ cursor: "pointer" }}>Datum računa</th>
                <th onClick={() => requestSort("due_date")} style={{ cursor: "pointer" }}>Datum valute</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocs.map((doc) => (
                <tr
                  key={doc.id}
                  className={highlightIds.includes(doc.id) ? "highlight-row" : ""}
                  title={doc.validation_alert || ""}
                >
                  <td>{doc.id}</td>
                  <td>
                    <a href={`/documents/${doc.id}`}>
                      {doc.filename.length > 20 ? doc.filename.slice(0, 20) + "..." : doc.filename}
                    </a>
                  </td>
                  <td>{doc.date ? new Date(doc.date).toLocaleString("hr-HR") : "-"}</td>
                  <td>{doc.supplier_name_ocr || "-"}</td>
                  <td>{doc.supplier_oib || "-"}</td>
                  <td>{doc.invoice_date ? new Date(doc.invoice_date).toLocaleDateString("hr-HR") : "-"}</td>
                  <td>{doc.due_date ? new Date(doc.due_date).toLocaleDateString("hr-HR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {itemsPerPage !== -1 && pageCount > 1 && (
            <nav className="mt-3">
              <ul className="pagination pagination-sm justify-content-end">
                {Array.from({ length: pageCount }, (_, i) => (
                  <li
                    key={i}
                    className={`page-item ${i + 1 === currentPage ? "active" : ""}`}
                  >
                    <button className="page-link" onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
