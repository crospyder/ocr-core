import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [highlightIds, setHighlightIds] = useState([]);

  const location = useLocation();

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
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
  }, []);

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

      // Pretvaramo datume u Date objekte radi usporedbe
      if (sortConfig.key === "date") {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }

      // Sortiranje po dobavljaču po polju supplier_name_ocr
      if (sortConfig.key === "supplier_name_ocr") {
        aVal = aVal ? aVal.toLowerCase() : "";
        bVal = bVal ? bVal.toLowerCase() : "";
      }

      // Sortiranje po OIB-u
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

  if (loading) return <p>Učitavanje dokumenata...</p>;
  if (error) return <p className="text-danger">Greška: {error}</p>;

  return (
    <div className="container mt-4">
      <h2 className="h3 mb-4 text-primary">Prethodno uploadani dokumenti obrađeni OCR-om</h2>

      {documents.length === 0 ? (
        <p>U bazi podataka nemamo dokumenata</p>
      ) : (
        <table className="table table-striped table-hover table-sm">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("filename")}>Naziv dokumenta</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("date")}>Arhivirano</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("supplier_name_ocr")}>Dobavljač</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("supplier_oib")}>OIB</th>
              <th style={{ cursor: "pointer" }} onClick={() => requestSort("amount")}>Iznos</th>
              <th>Status obrade</th>
              <th>Status validacije</th>
            </tr>
          </thead>
          <tbody>
            {sortedDocuments.map((doc) => (
              <tr
                key={doc.id}
                className={highlightIds.includes(doc.id) ? "highlight-row" : ""}
                title={doc.validation_alert || ""}
              >
                <td>
                  <a href={`/documents/${doc.id}`} title={doc.filename}>
                    {doc.filename.length > 20 ? doc.filename.slice(0, 20) + "..." : doc.filename}
                  </a>
                </td>
                <td>{doc.date ? new Date(doc.date).toLocaleString("hr-HR") : "Nepoznato"}</td>
                <td>{doc.supplier_name_ocr || "Nepoznato"}</td>
                <td>{doc.supplier_oib || "-"}</td>
                <td>{doc.amount !== undefined && doc.amount !== null ? doc.amount.toLocaleString("hr-HR") + " kn" : "-"}</td>
                <td>{doc.status || "-"}</td>
                <td>
                  {doc.validation_status === "valid" && <span className="text-success">Validno</span>}
                  {doc.validation_status === "not_found" && <span className="text-warning">Dobavljač nije u bazi</span>}
                  {doc.validation_status === "missing_oib" && <span className="text-danger">Nedostaje OIB - ručna provjera</span>}
                  {!doc.validation_status && "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
