import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OcrTextTagger from "./OcrTextTagger";

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialTags, setInitialTags] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    async function fetchDocument() {
      setLoading(true);
      try {
        const res = await fetch(`/api/documents/${id}`);
        if (!res.ok) throw new Error("Ne mogu dohvatiti dokument");
        const data = await res.json();
        setDocument(data);
        if (data.annotation && Array.isArray(data.annotation)) {
          setInitialTags(data.annotation);
        } else {
          setInitialTags([]);
        }
        setSelectedSupplier(data.supplier_id || "");
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error("Ne mogu dohvatiti dobavljače");
        const data = await res.json();
        setClients(data);
      } catch (e) {
        alert(e.message);
      }
    }
    fetchClients();
  }, []);

  async function handleSaveTags(tags) {
    try {
      const res = await fetch(`/api/annotations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tags),
      });
      if (!res.ok) throw new Error("Greška pri spremanju oznaka");
      alert("Oznake su spremljene!");
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleSupplierChange(e) {
    const newSupplierId = e.target.value;
    setSelectedSupplier(newSupplierId);
    setSavingSupplier(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: parseInt(newSupplierId) }),
      });
      if (!res.ok) throw new Error("Greška pri spremanju dobavljača");
      alert("Dobavljač spremljen");
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingSupplier(false);
    }
  }

  if (loading) return <p>Učitavanje dokumenta...</p>;
  if (!document) return <p>Dokument nije pronađen.</p>;

  return (
    <div className="container mt-4">
      <h2>Dokument: {document.filename}</h2>

      <div className="mb-3">
        <label htmlFor="supplierSelect" className="form-label">
          Odaberi dobavljača:
        </label>
        <select
          id="supplierSelect"
          className="form-select"
          value={selectedSupplier}
          onChange={handleSupplierChange}
          disabled={savingSupplier}
        >
          <option value="">-- Nije odabrano --</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          height: "60vh",
          overflow: "hidden",
        }}
      >
        {/* OCR prikaz */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#f9f9f9",
            padding: "1rem",
            borderRadius: "6px",
            boxShadow: "0 0 8px rgba(0,0,0,0.1)",
          }}
        >
          <OcrTextTagger
            text={document.ocrresult || ""}
            onSave={handleSaveTags}
            initialTags={initialTags}
          />
        </div>

        {/* RAW Sudreg odgovor */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#f0f0f0",
            padding: "1rem",
            borderRadius: "6px",
            boxShadow: "0 0 8px rgba(0,0,0,0.1)",
          }}
        >
          <h4>RAW odgovor iz Sudskog registra (sudreg_response)</h4>
          {document.sudreg_response ? (
            <pre style={{ fontSize: "0.9rem" }}>
              {typeof document.sudreg_response === "object"
                ? JSON.stringify(document.sudreg_response, null, 2)
                : document.sudreg_response}
            </pre>
          ) : (
            <p>Nema dostupnih podataka iz Sudskog registra.</p>
          )}
        </div>
      </div>
    </div>
  );
}
