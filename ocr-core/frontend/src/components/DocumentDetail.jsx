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

  // Dohvati dokument
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

  // Dohvati listu dobavljača
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

  // Spremi oznake
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

  // Spremi odabranog dobavljača
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

      <OcrTextTagger
        text={document.ocrresult || ""}
        onSave={handleSaveTags}
        initialTags={initialTags}
      />
    </div>
  );
}
