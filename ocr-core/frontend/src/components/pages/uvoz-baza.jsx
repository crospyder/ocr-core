import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

const ZANIMLJIVE_TABLICE = [
  "PARTNERS",
  "INVOICES",
  "IRAEU",
  "URAPE",
  "URAEU",
  "OFFERS",
  "TCLOSING"
];

const META_FIELDS = {
  IRA: [
    "document_type",
    "invoice_number",
    "date_invoice",
    "due_date",
    "amount",
    "oib",
    "supplier_name_ocr",
    "supplier_oib",
    "vat_number",
  ],
  PARTNERS: [
    "oib",
    "naziv",
    "adresa",
    "mjesto",
    "kontakt",
  ],
};

export default function UvozBaza() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedForProcessing, setSelectedForProcessing] = useState(null);
  const [mdbStructure, setMdbStructure] = useState(null);
  const [loadingStructure, setLoadingStructure] = useState(false);

  const [previewTable, setPreviewTable] = useState(null);
  const [tablePreviewRows, setTablePreviewRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [showAllTables, setShowAllTables] = useState(false);

  async function fetchFiles() {
    try {
      const res = await fetch("/api/uvoz/list");
      if (!res.ok) throw new Error("Ne mogu dohvatiti popis fajlova.");
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      toast.warn("Odaberi .mdb ili drugi fajl.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uvoz/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload nije uspio.");
      const data = await res.json();
      setUploadedFile(data.filename || file.name);
      toast.success("✅ Fajl uploadan.");
      setFile(null);
      fetchFiles();
    } catch (err) {
      toast.error(err.message || "Greška pri uploadu.");
    } finally {
      setUploading(false);
    }
  }

  async function handleShowStructure(filename) {
    setSelectedForProcessing(filename);
    setLoadingStructure(true);
    setMdbStructure(null);
    setPreviewTable(null);
    setTablePreviewRows([]);
    try {
      const res = await fetch(`/api/uvoz/mdb_structure?filename=${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error("Ne mogu dohvatiti strukturu baze.");
      const data = await res.json();
      setMdbStructure(data.tables || []);
    } catch (err) {
      toast.error(err.message || "Greška pri dohvaćanju strukture baze.");
    } finally {
      setLoadingStructure(false);
    }
  }

  async function handlePreviewTable(tableName) {
    if (!selectedForProcessing) return;
    setPreviewTable(tableName);
    setLoadingPreview(true);
    setTablePreviewRows([]);
    try {
      const res = await fetch(`/api/uvoz/preview?filename=${encodeURIComponent(selectedForProcessing)}&table=${encodeURIComponent(tableName)}`);
      if (!res.ok) throw new Error("Greška pri dohvaćanju podataka tablice.");
      const data = await res.json();
      setTablePreviewRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      toast.error(err.message || "Greška pri dohvaćanju podataka tablice.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleImport(filename) {
    try {
      const software = "synesis";
      const res = await fetch(`/api/import/do_import/${software}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) throw new Error("Greška pri uvozu!");
      const data = await res.json();
      toast.success(data.message || "Uvoz završen");
    } catch (err) {
      toast.error(err.message || "Greška pri uvozu.");
    }
  }

  const prikazaneTablice = mdbStructure
    ? (showAllTables
        ? mdbStructure
        : mdbStructure.filter(t =>
            ZANIMLJIVE_TABLICE.includes(t.table.toUpperCase())
          )
      )
    : [];

  return (
    <div className="container mt-4">
      <h2>Uvoz podataka iz baze (npr. Synesis .mdb)</h2>
      <form onSubmit={handleUpload} className="mb-4">
        <div className="mb-2">
          <input
            type="file"
            accept=".mdb,.accdb,.csv,.xlsx"
            onChange={e => setFile(e.target.files[0])}
            disabled={uploading}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={uploading || !file}
        >
          {uploading ? "Učitavanje..." : "Uploadaj fajl"}
        </button>
      </form>

      <h4>Datoteke u folderu za uvoz</h4>
      <table className="table table-sm table-bordered" style={{maxWidth: 500, fontSize: 15}}>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Veličina (B)</th>
            <th>Akcija</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.name}>
              <td>{f.name}</td>
              <td>{f.size}</td>
              <td>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleShowStructure(f.name)}
                  disabled={loadingStructure && selectedForProcessing === f.name}
                >
                  Odaberi za obradu
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedForProcessing && (
        <div className="alert alert-info mt-3 d-flex align-items-center">
          Odabrana datoteka za obradu: <b className="ms-2">{selectedForProcessing}</b>
          <button
            className="btn btn-success ms-3"
            onClick={() => handleImport(selectedForProcessing)}
          >
            Pokreni uvoz podataka
          </button>
        </div>
      )}

      {loadingStructure && (
        <div className="mt-3">Dohvaćam strukturu baze...</div>
      )}

      {mdbStructure && mdbStructure.length > 0 && (
        <div className="mt-4" style={{
          maxHeight: "100vh",
          overflowY: "auto",
          border: "1px solid #e4e9f1",
          borderRadius: 7,
          background: "#fafcff",
          padding: 16
        }}>
          <h4>Struktura baze:</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {prikazaneTablice.map(table => (
              <div
                key={table.table}
                style={{
                  marginBottom: 18,
                  border: "1px solid #dde5ef",
                  borderRadius: 6,
                  background: "#fff",
                  boxShadow: "0 2px 6px #eee",
                  overflowX: "auto"
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    background: "#f1f5f9",
                    borderBottom: "1px solid #eee",
                    padding: "8px 18px",
                    fontSize: 18,
                    cursor: "pointer",
                    color: previewTable === table.table ? "#1976d2" : "inherit"
                  }}
                  onClick={() => handlePreviewTable(table.table)}
                  title="Prikaži preview podataka"
                >
                  {table.table}
                </div>
                {previewTable === table.table && (
                  <div style={{padding: "0 20px 10px 20px"}}>
                    <table className="table table-sm mb-2 mt-2" style={{ minWidth: 180 }}>
                      <thead>
                        <tr>
                          <th style={{ fontSize: 14, padding: "3px 8px" }}>Kolona</th>
                          <th style={{ fontSize: 14, padding: "3px 8px" }}>Tip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map(col => (
                          <tr key={col.name}>
                            <td style={{ fontSize: 14, padding: "3px 8px" }}>{col.name}</td>
                            <td style={{ fontSize: 14, padding: "3px 8px" }}>{col.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{maxHeight: 320, overflowY: "auto", borderTop: "1px solid #eee", marginTop: 3, background: "#f8fafc", padding: "8px 4px 2px 4px" }}>
                      {loadingPreview ? (
                        <span>Učitavam podatke...</span>
                      ) : tablePreviewRows.length === 0 ? (
                        <span>Nema podataka za prikaz.</span>
                      ) : (
                        <table className="table table-bordered table-xs" style={{fontSize: 13}}>
                          <thead>
                            <tr>
                              {Object.keys(tablePreviewRows[0]).map(col => (
                                <th key={col}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tablePreviewRows.map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).map((val, j) => (
                                  <td key={j}>{val !== null ? val.toString() : ""}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
