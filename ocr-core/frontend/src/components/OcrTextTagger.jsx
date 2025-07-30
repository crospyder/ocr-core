import React, { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import { toast } from "react-toastify";

// Tipovi dokumenata
const DOCUMENT_TYPES = [
  { key: "FAKTURA", label: "Faktura" },
  { key: "IRA", label: "Izlazni račun (IRA)" },
  { key: "IZVOD", label: "Izvod" },
  { key: "UGOVOR", label: "Ugovor" },
  { key: "CESIJA", label: "Cesija" },
  { key: "IOS", label: "IOS" },
  { key: "KONTO_KARTICA", label: "Konto kartica" },
  { key: "OSTALO", label: "Ostalo" },
  { key: "NEPOZNATO", label: "Nepoznato" },
];

// Aktivni tagovi — maknut partner_name, koristi samo supplier_name_ocr
const TAG_TYPES = [
  { key: "oib", label: "OIB (HR)" },
  { key: "vat_number", label: "VAT broj (EU/Strani dobavljač)" },
  { key: "invoice_number", label: "Broj računa" },
  { key: "date_invoice", label: "Datum računa" },
  { key: "due_date", label: "Datum valute" },
  { key: "amount", label: "Iznos" },
  { key: "supplier_name_ocr", label: "Naziv partnera/dobavljača" },
];

// Polja po tipu dokumenta (partner_name izbačen)
const fieldsForType = {
  FAKTURA: ["supplier_name_ocr", "amount", "date_invoice", "due_date", "invoice_number", "oib", "vat_number"],
  IRA: ["supplier_name_ocr", "amount", "date_invoice", "due_date", "invoice_number", "oib", "vat_number"],
  IZVOD: ["amount", "date_invoice", "due_date", "oib", "vat_number"],
  UGOVOR: ["supplier_name_ocr", "date_invoice", "due_date", "oib", "vat_number"],
  CESIJA: ["supplier_name_ocr", "date_invoice", "due_date"],
  IOS: ["supplier_name_ocr", "date_invoice", "due_date"],
  KONTO_KARTICA: ["supplier_name_ocr", "date_invoice", "due_date"],
  OSTALO: ["oib", "vat_number"],
  NEPOZNATO: [],
};

export default function OcrTextTagger({ text, initialTags = {}, onSave, loading }) {
  // Filtriraj initialTags (makni partner_name ako dođe legacy)
  const cleanInit = { ...initialTags };
  delete cleanInit.partner_name;
  const [tags, setTags] = useState(cleanInit);
  const textRef = useRef(null);

  useEffect(() => {
    const t = { ...(initialTags || {}) };
    delete t.partner_name;
    setTags(t);
  }, [initialTags]);

  const documentType = tags.document_type || "OSTALO";
  const knownTypes = DOCUMENT_TYPES.map(dt => dt.key);
  const docTypeKey = knownTypes.includes(documentType) ? documentType : "OSTALO";
  const activeFields = fieldsForType[docTypeKey] || [];

  function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";
    const range = selection.getRangeAt(0);
    if (!textRef.current.contains(range.commonAncestorContainer)) return "";
    return selection.toString();
  }

  function normalizeDate(dateStr) {
    const corrected = dateStr.trim().replace(/\s+/g, "");
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(corrected)) return corrected;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(corrected + ".")) return corrected + ".";
    return corrected;
  }

  function handleQuickTag(key) {
    const selected = getSelectedText();
    if (!selected) {
      toast.error("❗ Selektirajte tekst u OCR prikazu!");
      return;
    }
    const value = key.includes("date") ? normalizeDate(selected) : selected.trim();
    setTags(prev => ({
      ...prev,
      [key]: value,
    }));
    window.getSelection().removeAllRanges();
  }

  function handleInputChange(key, value) {
    const cleanValue = key.includes("date") ? normalizeDate(value) : value;
    setTags(prev => ({
      ...prev,
      [key]: cleanValue,
    }));
  }

  function handleRemove(key) {
    setTags(prev => {
      const c = { ...prev };
      delete c[key];
      return c;
    });
  }

  function handleTypeChange(e) {
    const value = e.target.value;
    setTags(prev => {
      const cleaned = { document_type: value };
      for (const key of fieldsForType[value] || []) {
        if (prev[key]) cleaned[key] = prev[key];
      }
      return cleaned;
    });
  }

  function handleSave() {
    if (onSave) onSave(tags);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 0 6px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#1976d2" }}>
        <Info size={18} />
        <span style={{ fontSize: 14 }}>
          Odaberite tip dokumenta. Ovisno o tipu, označite ili upišite važne elemente (OIB, iznos...) u prikazana polja.
        </span>
      </div>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ minWidth: 120, fontWeight: 600 }}>Tip dokumenta:</label>
        <select
          value={docTypeKey}
          onChange={handleTypeChange}
          disabled={loading}
          style={{ maxWidth: 240, padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
        >
          {DOCUMENT_TYPES.map(dt => (
            <option key={dt.key} value={dt.key}>{dt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div
          ref={textRef}
          style={{
            flex: 1,
            whiteSpace: "pre-wrap",
            border: "1.3px solid #eaf1fb",
            padding: "1.1rem",
            minHeight: "300px",
            maxHeight: "500px",
            overflowY: "auto",
            userSelect: "text",
            fontFamily: "monospace",
            fontSize: "1rem",
            lineHeight: "1.4",
            background: "#fff",
            borderRadius: "10px",
          }}
          tabIndex={0}
        >
          {text}
        </div>

        <div style={{ flex: 1, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {TAG_TYPES.filter(t => activeFields.includes(t.key)).map(({ key, label }) => (
            <div key={key}>
              <div style={{ fontSize: 10, fontWeight: 400, marginBottom: 2 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  style={{ width: 200, padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                  value={tags[key] || ""}
                  onChange={e => handleInputChange(key, e.target.value)}
                  placeholder={
                    key === "supplier_name_ocr"
                      ? "Naziv partnera/dobavljača (iz baze ili ručno)"
                      : `Upiši ili označi ${label.toLowerCase()}`
                  }
                  disabled={loading}
                />
                <button
                  onClick={() => handleQuickTag(key)}
                  disabled={loading}
                  style={{ padding: "6px 10px", borderRadius: 4, background: "#1976d2", color: "white", border: "none" }}
                >
                  Preuzmi
                </button>
                {tags[key] && (
                  <button
                    onClick={() => handleRemove(key)}
                    disabled={loading}
                    style={{ padding: "6px 8px", borderRadius: 4, background: "#d32f2f", color: "white", border: "none" }}
                    title="Obriši"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={loading || !docTypeKey}
            style={{ marginTop: 12, alignSelf: "flex-start", padding: "8px 16px", borderRadius: 4, background: "#2e7d32", color: "white", border: "none" }}
          >
            {loading ? "Spremanje..." : "Spremi oznake"}
          </button>

          <div style={{ marginTop: 24, fontSize: 12, color: "#999" }}>
            <hr style={{ margin: "12px 0" }} />
            <div><strong>Trenutne oznake (JSON):</strong></div>
            <pre style={{ fontSize: 11 }}>{JSON.stringify(tags, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
