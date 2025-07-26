import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Documents() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [documentType, setDocumentType] = useState(query.get("document_type") || "");
  const [supplierOib, setSupplierOib] = useState(query.get("supplier_oib") || "");
  const [selectedSupplier, setSelectedSupplier] = useState(query.get("selected_supplier") || "");
  const [selectedYear, setSelectedYear] = useState(query.get("selected_year") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(query.get("page") || "1", 10));
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(query.get("page_size") || "50", 10));
  const [sortConfig, setSortConfig] = useState({
    key: query.get("sort_key") || "date",
    direction: query.get("sort_dir") || "desc"
  });

  useEffect(() => {
    const params = new URLSearchParams();

    if (documentType) params.set("document_type", documentType);
    if (supplierOib) params.set("supplier_oib", supplierOib);
    if (selectedSupplier) params.set("selected_supplier", selectedSupplier);
    if (selectedYear) params.set("selected_year", selectedYear);
    if (currentPage) params.set("page", currentPage);
    if (itemsPerPage) params.set("page_size", itemsPerPage);
    if (sortConfig.key) params.set("sort_key", sortConfig.key);
    if (sortConfig.direction) params.set("sort_dir", sortConfig.direction);

    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [documentType, supplierOib, selectedSupplier, selectedYear, currentPage, itemsPerPage, sortConfig, navigate, location.pathname]);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, supplierOib, selectedSupplier, selectedYear, currentPage, itemsPerPage, sortConfig]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const queryParts = [];
      if (documentType) queryParts.push(`document_type=${encodeURIComponent(documentType)}`);
      if (supplierOib) queryParts.push(`supplier_oib=${encodeURIComponent(supplierOib)}`);
      if (selectedSupplier) queryParts.push(`selected_supplier=${encodeURIComponent(selectedSupplier)}`);
      if (selectedYear) queryParts.push(`selected_year=${encodeURIComponent(selectedYear)}`);
      queryParts.push(`page=${currentPage}`);
      queryParts.push(`page_size=${itemsPerPage}`);
      queryParts.push(`sort_key=${sortConfig.key}`);
      queryParts.push(`sort_dir=${sortConfig.direction}`);
      const queryString = queryParts.length ? `?${queryParts.join("&")}` : "";

      const res = await fetch(`/api/documents/${queryString}`);
      if (!res.ok) throw new Error("Greška pri dohvatu dokumenata.");
      const data = await res.json();
      setDocuments(Array.isArray(data.items) ? data.items : []);
      setTotalCount(data.total || 0);
      setError(null);
    } catch (err) {
      toast.error(`❌ ${err.message}`);
      setDocuments([]);
      setTotalCount(0);
      setError(err.message);
      console.error("Greška pri dohvatu dokumenata:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearAll() {
    if (!window.confirm("Jesi li siguran da želiš obrisati SVE dokumente, anotacije, partnere, PDF-ove i Elasticsearch indeks?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/clear-all", { method: "DELETE" });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Greška pri brisanju dokumenata: ${errorText}`);
      }
      await res.json();
      toast.success("✅ Svi dokumenti, partneri, anotacije, PDF-ovi i ES indeks su obrisani.");
      setCurrentPage(1);
      fetchDocuments();
    } catch (err) {
      toast.error(`❌ ${err.message}`);
      console.error("Greška pri brisanju:", err);
    } finally {
      setLoading(false);
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
    return Array.from(setYears).sort((a, b) => b - a);
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

  const pageCount = Math.ceil(totalCount / itemsPerPage);

  function renderDocTag(type) {
    if (!type) return <span className="text-muted">-</span>;
    const cls = `doc-tag ${type.toLowerCase()}`;
    return <span className={cls}>{type}</span>;
  }

  const PaginationComponent = () => (
    <nav className="pagination-container" aria-label="Pagination navigation">
      <ul className="pagination">
        <li className={`page-item${currentPage === 1 ? " disabled" : ""}`}>
          <button
            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            aria-disabled={currentPage === 1}
            type="button"
            aria-label="Prethodna stranica"
          >
            ←
          </button>
        </li>

        {Array.from({ length: pageCount }, (_, i) => (
          <li key={i} className={`page-item${i + 1 === currentPage ? " active" : ""}`}>
            <button
              onClick={() => setCurrentPage(i + 1)}
              aria-current={i + 1 === currentPage ? "page" : undefined}
              type="button"
            >
              {i + 1}
            </button>
          </li>
        ))}

        <li className={`page-item${currentPage === pageCount ? " disabled" : ""}`}>
          <button
            onClick={() => currentPage < pageCount && setCurrentPage(currentPage + 1)}
            aria-disabled={currentPage === pageCount}
            type="button"
            aria-label="Sljedeća stranica"
          >
            →
          </button>
        </li>
      </ul>
    </nav>
  );

  return (
    <div className="container mt-2 mb-2">
      <div className="filters-pagination-bar d-flex justify-between align-center mb-3 flex-wrap gap-3">
        <div className="filters-container d-flex flex-wrap gap-2">
          <div className="filter-group d-flex flex-column">
            <label htmlFor="documentType" className="filter-label">Vrsta dokumenta</label>
            <select
              id="documentType"
              className="form-select"
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Vrsta dokumenta"
            >
              <option value="">Sve</option>
              <option value="URA">URA</option>
              <option value="IRA">IRA</option>
              <option value="UGOVOR">UGOVOR</option>
              <option value="IZVOD">IZVOD</option>
              <option value="NEPOZNATO">NEPOZNATO</option>
            </select>
          </div>
          <div className="filter-group d-flex flex-column">
            <label htmlFor="selectedSupplier" className="filter-label">Dobavljač</label>
            <select
              id="selectedSupplier"
              className="form-select"
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Dobavljač"
            >
              <option value="">Svi</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="filter-group d-flex flex-column">
            <label htmlFor="selectedYear" className="filter-label">Godina</label>
            <select
              id="selectedYear"
              className="form-select"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Godina"
            >
              <option value="">Sve</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="filter-group d-flex flex-column">
            <label htmlFor="itemsPerPage" className="filter-label">Dokumenata po stranici</label>
            <select
              id="itemsPerPage"
              className="form-select"
              value={itemsPerPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              aria-label="Broj dokumenata po stranici"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="1000">1000</option>
              <option value="-1">Sve</option>
            </select>
          </div>
        </div>

        <PaginationComponent />
      </div>

      {loading ? (
        <div className="text-center py-4">Učitavanje...</div>
      ) : error ? (
        <div className="text-danger text-center py-4">{error}</div>
      ) : sortedDocuments.length === 0 ? (
        <div className="text-center py-4">Nema dokumenata za prikaz.</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-custom table-hover w-100">
              <thead>
                <tr>
                  <th onClick={() => requestSort("id")} className="sortable">#</th>
                  <th onClick={() => requestSort("filename")} className="sortable">Naziv</th>
                  <th onClick={() => requestSort("document_type")} className="sortable">Vrsta dokumenta</th>
                  <th onClick={() => requestSort("date")} className="sortable">Arhivirano</th>
                  <th onClick={() => requestSort("supplier_name_ocr")} className="sortable">Dobavljač</th>
                  <th onClick={() => requestSort("supplier_oib")} className="sortable">OIB</th>
                  <th onClick={() => requestSort("doc_number")} className="sortable">Broj računa</th>
                  <th onClick={() => requestSort("invoice_date")} className="sortable">Datum računa</th>
                  <th onClick={() => requestSort("due_date")} className="sortable">Datum valute</th>
                  <th onClick={() => requestSort("amount")} className="sortable">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {sortedDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.id}</td>
                    <td>
                      <a href={`/documents/${doc.id}`} className="fw-bold">
                        {doc.filename}
                      </a>
                    </td>
                    <td>{renderDocTag(doc.document_type)}</td>
                    <td>{doc.date ? new Date(doc.date).toLocaleString("hr-HR") : "-"}</td>
                    <td>
                      {doc.supplier_oib ? (
                        <a
                          href={`/documents/partner/${doc.supplier_oib}`}
                          onClick={e => {
                            e.preventDefault();
                            navigate(`/documents/partner/${doc.supplier_oib}`);
                          }}
                        >
                          {doc.supplier_name_ocr || "-"}
                        </a>
                      ) : (
                        doc.supplier_name_ocr || "-"
                      )}
                    </td>
                    <td>{doc.supplier_oib || "-"}</td>
                    <td>{doc.doc_number || "-"}</td>
                    <td>{doc.invoice_date ? new Date(doc.invoice_date).toLocaleDateString("hr-HR") : "-"}</td>
                    <td>{doc.due_date ? new Date(doc.due_date).toLocaleDateString("hr-HR") : "-"}</td>
                    <td>{doc.amount !== undefined ? doc.amount : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationComponent />
        </>
      )}
    </div>
  );
}
