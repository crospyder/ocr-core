import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });

  const [documentType, setDocumentType] = useState("");
  const [supplierOib, setSupplierOib] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [clearLoading, setClearLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const oibFromPath = pathParts[2] === "partner" ? pathParts[3] : "";
    setSupplierOib(oibFromPath || "");
  }, [location.pathname]);

  useEffect(() => {
    fetchDocuments();
  }, [documentType, supplierOib]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const queryParts = [];
      if (documentType) queryParts.push(`document_type=${encodeURIComponent(documentType)}`);
      if (supplierOib) queryParts.push(`supplier_oib=${encodeURIComponent(supplierOib)}`);
      const query = queryParts.length ? `?${queryParts.join("&")}` : "";
      const res = await fetch(`/api/documents/${query}`);
      if (!res.ok) throw new Error("Greška pri dohvatu dokumenata.");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      toast.error(`❌ ${err.message}`);
      setDocuments([]);
      console.error("Greška pri dohvatu dokumenata:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Jesi li siguran da želiš obrisati SVE dokumente, anotacije, partnere, PDF-ove i Elasticsearch indeks?")) return;

    setClearLoading(true);

    try {
      const res = await fetch("/api/documents/clear-all", { method: "DELETE" });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Greška pri brisanju dokumenata: ${errorText}`);
      }

      const result = await res.json();
      toast.success("✅ Svi dokumenti, partneri, anotacije, PDF-ovi i ES indeks su obrisani.");
      fetchDocuments();
    } catch (err) {
      toast.error(`❌ ${err.message}`);
      console.error("Greška pri brisanju:", err);
    } finally {
      setClearLoading(false);
    }
  }

  function requestSort(key) {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  }

  const suppliers = useMemo(() => {
    const setSuppliers = new Set(documents.map(d => d.supplier_name_ocr).filter(Boolean));
    return Array.from(setSuppliers).sort();
  }, [documents]);

  const years = useMemo(() => {
    const setYears = new Set(documents.map(d => {
      if (d.invoice_date) return new Date(d.invoice_date).getFullYear();
      return null;
    }).filter(Boolean));
    return Array.from(setYears).sort((a,b) => b - a);
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      return (
        (!documentType || doc.document_type === documentType) &&
        (!selectedSupplier || doc.supplier_name_ocr === selectedSupplier) &&
        (!selectedYear || (doc.invoice_date && new Date(doc.invoice_date).getFullYear() === parseInt(selectedYear)))
      );
    });
  }, [documents, documentType, selectedSupplier, selectedYear]);

  const sortedDocuments = useMemo(() => {
    const docs = [...filteredDocuments];
    return docs.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (["date", "invoice_date", "due_date"].includes(sortConfig.key)) {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      return 0;
    });
  }, [filteredDocuments, sortConfig]);

  const pageCount = Math.ceil(sortedDocuments.length / itemsPerPage);
  const paginatedDocs = useMemo(() => {
    if (itemsPerPage === -1) return sortedDocuments;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedDocuments.slice(start, start + itemsPerPage);
  }, [sortedDocuments, currentPage, itemsPerPage]);

  return (
    <div className="container-fluid mt-4">
      {/* Naslov */}
      <div className="page-title-container text-center mb-3">
        <h2 className="h4 text-black fw-bold mb-0">OCR dokumenti</h2>
      </div>

      {/* Horizontalni filteri */}
      <div className="d-flex justify-content-center flex-wrap gap-3 mb-3 filters-row">
        <select
          className="form-select form-select-sm"
          value={documentType}
          onChange={(e) => {
            setDocumentType(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Vrsta dokumenta"
        >
          <option value="">Vrsta: Sve</option>
          <option value="URA">URA</option>
          <option value="IRA">IRA</option>
          <option value="UGOVOR">UGOVOR</option>
          <option value="IZVOD">IZVOD</option>
        </select>

        <select
          className="form-select form-select-sm"
          value={selectedSupplier}
          onChange={(e) => {
            setSelectedSupplier(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Dobavljač"
        >
          <option value="">Dobavljač: Svi</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Godina"
        >
          <option value="">Godina: Sve</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          value={itemsPerPage}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          aria-label="Broj dokumenata po stranici"
        >
          <option value="50">50 / stranici</option>
          <option value="100">100</option>
          <option value="1000">1000</option>
          <option value="-1">Sve</option>
        </select>
      </div>

      {loading ? (
        <p>Učitavanje...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : paginatedDocs.length === 0 ? (
        <p>Nema dokumenata za prikaz.</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-striped table-hover table-sm w-100">
              <thead className="table-light">
                <tr>
                  <th onClick={() => requestSort("id")} style={{ cursor: "pointer" }}>#</th>
                  <th onClick={() => requestSort("filename")} style={{ cursor: "pointer" }}>Naziv</th>
                  <th onClick={() => requestSort("document_type")} style={{ cursor: "pointer" }}>Vrsta dokumenta</th>
                  <th onClick={() => requestSort("date")} style={{ cursor: "pointer" }}>Arhivirano</th>
                  <th onClick={() => requestSort("supplier_name_ocr")} style={{ cursor: "pointer" }}>Dobavljač</th>
                  <th onClick={() => requestSort("supplier_oib")} style={{ cursor: "pointer" }}>OIB</th>
                  <th onClick={() => requestSort("doc_number")} style={{ cursor: "pointer" }}>Broj računa</th>
                  <th onClick={() => requestSort("invoice_date")} style={{ cursor: "pointer" }}>Datum računa</th>
                  <th onClick={() => requestSort("due_date")} style={{ cursor: "pointer" }}>Datum valute</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.id}</td>
                    <td>
                      <a href={`/documents/${doc.id}`}>{doc.filename}</a>
                    </td>
                    <td>
                      {doc.document_type ? (
                        <span className="badge bg-info" style={{ fontSize: "0.9em" }}>
                          {doc.document_type}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{doc.date ? new Date(doc.date).toLocaleString("hr-HR") : "-"}</td>
                    <td>
                      {doc.supplier_oib ? (
                        <button
                          className="btn btn-link p-0 text-decoration-underline"
                          onClick={() => navigate(`/documents/partner/${doc.supplier_oib}`)}
                        >
                          {doc.supplier_name_ocr || "-"}
                        </button>
                      ) : (
                        doc.supplier_name_ocr || "-"
                      )}
                    </td>
                    <td>{doc.supplier_oib || "-"}</td>
                    <td>{doc.doc_number || "-"}</td>
                    <td>{doc.invoice_date ? new Date(doc.invoice_date).toLocaleDateString("hr-HR") : "-"}</td>
                    <td>{doc.due_date ? new Date(doc.due_date).toLocaleDateString("hr-HR") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {itemsPerPage !== -1 && pageCount > 1 && (
            <nav className="mt-3">
              <ul className="pagination pagination-sm justify-content-end">
                {Array.from({ length: pageCount }, (_, i) => (
                  <li key={i} className={`page-item ${i + 1 === currentPage ? "active" : ""}`}>
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
