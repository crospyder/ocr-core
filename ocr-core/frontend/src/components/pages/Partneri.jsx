import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Partneri() {
  const [partneri, setPartneri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "naziv", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    setLoading(true);
    try {
      const res = await fetch("/api/partneri");
      if (!res.ok) throw new Error(`Greška: ${res.status} ${res.statusText}`);
      const data = await res.json();
      setPartneri(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      toast.error("❌ " + err.message);
      setPartneri([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function requestSort(key) {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  }

  const filtered = useMemo(() => {
    return partneri.filter((p) =>
      [p.naziv, p.oib, p.kontakt_osoba].some((field) =>
        field?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [partneri, searchTerm]);

  const sorted = useMemo(() => {
    const sortedPartners = [...filtered];
    sortedPartners.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      return 0;
    });
    return sortedPartners;
  }, [filtered, sortConfig]);

  const pageCount = Math.ceil(sorted.length / itemsPerPage);

  const paginated = useMemo(() => {
    if (itemsPerPage === -1) return sorted;
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage, itemsPerPage]);

  return (
    <div className="container mt-2 mb-2 partneri-page">
      <div className="text-center mb-3">
        <h2 className="page-title mb-0">Partneri</h2>
      </div>

      <input
        type="text"
        placeholder="Pretraži po nazivu, OIB-u ili kontakt osobi..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
        className="form-control mb-3"
        autoFocus
      />

      {loading ? (
        <div className="text-center py-4">Učitavanje...</div>
      ) : error ? (
        <div className="text-danger text-center py-4">{error}</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-custom table-hover w-100 partner-table">
              <thead>
                <tr>
                  <th
                    onClick={() => requestSort("naziv")}
                    style={{ cursor: "pointer" }}
                  >
                    Naziv {sortConfig.key === "naziv" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    onClick={() => requestSort("oib")}
                    style={{ cursor: "pointer" }}
                  >
                    OIB {sortConfig.key === "oib" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    onClick={() => requestSort("adresa")}
                    style={{ cursor: "pointer" }}
                  >
                    Adresa {sortConfig.key === "adresa" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Telefon</th>
                  <th>Email</th>
                  <th
                    onClick={() => requestSort("kontakt_osoba")}
                    style={{ cursor: "pointer" }}
                  >
                    Kontakt osoba {sortConfig.key === "kontakt_osoba" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      Nema partnera za prikaz
                    </td>
                  </tr>
                ) : (
                  paginated.map((partner) => (
                    <tr key={partner.id}>
                      <td className="text-start">
                        <a
                          href={`/documents/partner/${partner.oib}`}
                          className="partner-name-link fw-bold"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/documents/partner/${partner.oib}`);
                          }}
                          tabIndex={-1}
                        >
                          {partner.naziv}
                        </a>
                      </td>
                      <td>{partner.oib}</td>
                      <td>{partner.adresa}</td>
                      <td>{partner.kontakt_telefon || <span className="text-muted">-</span>}</td>
                      <td>{partner.kontakt_email || <span className="text-muted">-</span>}</td>
                      <td>{partner.kontakt_osoba || <span className="text-muted">-</span>}</td>
                      <td>
                        <button
                          className="btn btn-xs btn-warning"
                          onClick={() => navigate(`/partneri/edit/${partner.id}`)}
                        >
                          Uredi
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {itemsPerPage !== -1 && pageCount > 1 && (
            <nav className="mt-2 d-flex justify-end">
              <ul className="pagination d-flex gap-1">
                {Array.from({ length: pageCount }, (_, i) => (
                  <li
                    key={i}
                    className={`page-item${i + 1 === currentPage ? " active" : ""}`}
                  >
                    <button
                      className="btn btn-xs"
                      style={{ minWidth: 34 }}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <select
            className="form-select mt-3"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Broj partnera po stranici"
            style={{ maxWidth: 120 }}
          >
            <option value="50">50 / stranici</option>
            <option value="100">100</option>
            <option value="1000">1000</option>
            <option value="-1">Sve</option>
          </select>
        </>
      )}
    </div>
  );
}
