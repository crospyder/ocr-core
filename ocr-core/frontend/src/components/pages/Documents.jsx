import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [highlightIds, setHighlightIds] = useState([]);
  const [documentType, setDocumentType] = useState("");

  const location = useLocation();

  async function fetchDocuments() {
    setLoading(true);
    try {
      const query = documentType ? `?document_type=${encodeURIComponent(documentType)}` : "";
      const res = await fetch(`/api/documents${query}`);
      if (!res.ok) throw new Error("Ne mogu se povezati na SQL bazu, greška pri dohvatu dokumenata.");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
      setError(null);

      if (location.state?.justUploaded) {
        const lastUploadedCount = location.state.uploadedIds?.length || 5;
        const lastIds = location.state.uploadedIds || (Array.isArray(data) ? data.slice(0, lastUploadedCount).map(doc => doc.id) : []);
        setHighlightIds(lastIds);
      } else {
        setHighlightIds([]);
      }
    } catch (err) {
      setError(err.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, [documentType]);

  useEffect(() => {
    if (highlightIds.length > 0) {
      const timer = setTimeout(() => setHighlightIds([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightIds]);

  const sortedDocuments = React.useMemo(() => {
    if (!sortConfig.key) return documents;

    return [...documents].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "date" || sortConfig.key === "invoice_date" || sortConfig.key === "due_date") {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }

      if (sortConfig.key === "supplier_name_ocr") {
        aVal = aVal ? aVal.toLowerCase() : "";
        bVal = bVal ? bVal.toLowerCase() : "";
      }

      if (sortConfig.key === "supplier_oib") {
        aVal = aVal || "";
        bVal = bVal || "";
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [documents, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h3 text-primary">Prethodno uploadani dokumenti obrađeni OCR-om</h2>
        <select
          className="form-select w-auto"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          <option value="">-- Sve vrste --</option>
          <option value="URA">URA</option>
          <option value="IRA">IRA</option>
          <option value="IZVOD">IZVOD</option>
          <option value="UGOVOR">UGOVOR</option>
        </select>
      </div>

      {loading ? (
        <p>Učitavanje dokumenata...</p>
      ) : error ? (
        <p className="text-danger">Greška: {error}</p>
      ) : documents.length === 0 ? (
        <p>U bazi podataka nemamo dokumenata</p>
      ) : (
        <table className="table table-striped table-hover table-sm">
          <thead>
            <tr>
              <th style={{ width: "50px" }}>#</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("filename")}>Naziv dokumenta</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("date")}>Arhivirano</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("supplier_name_ocr")}>Dobavljač</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("supplier_oib")}>OIB</th>
              {/* Uklonjeno: Iznos, Status obrade, Status validacije */}
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("invoice_date")}>Datum računa</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("due_date")}>Datum valute</th>
            </tr>
          </thead>
          <tbody>
            {sortedDocuments.map((doc, index) => (
              <tr
                key={doc.id}
                className={highlightIds.includes(doc.id) ? "highlight-row" : ""}
                title={doc.validation_alert || ""}
              >
                <td>{doc.id}</td>
                <td>
                  <a href={`/documents/${doc.id}`} title={doc.filename}>
                    {doc.filename.length > 20 ? doc.filename.slice(0, 20) + "..." : doc.filename}
                  </a>
                </td>
                <td>{doc.date ? new Date(doc.date).toLocaleString("hr-HR") : "Nepoznato"}</td>
                <td>{doc.supplier_name_ocr || "Nepoznato"}</td>
                <td>{doc.supplier_oib || "-"}</td>
                <td>{doc.invoice_date ? new Date(doc.invoice_date).toLocaleDateString("hr-HR") : "-"}</td>
                <td>{doc.due_date ? new Date(doc.due_date).toLocaleDateString("hr-HR") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
