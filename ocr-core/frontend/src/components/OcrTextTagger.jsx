import React, { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import { toast } from "react-toastify";

// Tipovi dokumenata
const DOCUMENT_TYPES = [
  { key: "URA", label: "Ulazni račun (URA)" },
  { key: "IRA", label: "Izlazni račun (IRA)" },
  { key: "IZVOD", label: "Izvod" },
  { key: "UGOVOR", label: "Ugovor" },
  { key: "OSTALO", label: "Ostalo" },
];

// Master polja (sve opcije)
const TAG_TYPES = [
  { key: "oib", label: "OIB (HR)" },
  { key: "euvat", label: "EU VAT (EU dobavljač)" },
  { key: "vat", label: "VAT (Strani dobavljač)" },
  { key: "invoice_number", label: "Broj računa" },
  { key: "date_invoice", label: "Datum računa" },
  { key: "due_date", label: "Datum valute" },
  { key: "amount", label: "Iznos" },
  { key: "supplier_name", label: "Naziv dobavljača" },
  { key: "partner_name", label: "Naziv partnera" },
];

// Koja polja prikazati za tip dokumenta
const fieldsForType = {
  URA: ["supplier_name", "amount", "date_invoice", "due_date", "invoice_number", "oib", "euvat", "vat"],
  IRA: ["partner_name", "amount", "date_invoice", "due_date", "invoice_number", "oib", "euvat", "vat"],
  IZVOD: ["amount", "date_invoice", "due_date", "oib", "euvat", "vat"],
  UGOVOR: ["partner_name", "date_invoice", "due_date", "oib", "euvat", "vat"],
  OSTALO: ["oib", "euvat", "vat"],
};

export default function OcrTextTagger({ text, initialTags = {}, onSave, loading }) {
  const [tags, setTags] = useState(initialTags);
  const textRef = useRef(null);

  useEffect(() => {
    setTags(initialTags || {});
  }, [initialTags]);

  const documentType = tags.document_type || "OSTALO";
  const activeFields = fieldsForType[documentType] || [];

  function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";
    const range = selection.getRangeAt(0);
    if (!textRef.current.contains(range.commonAncestorContainer)) return "";
    return selection.toString();
  }

  function handleQuickTag(key) {
    const selected = getSelectedText();
    if (!selected) {
      toast.error("❗ Selektirajte tekst u OCR prikazu!");
      return;
    }
    setTags(prev => ({
      ...prev,
      [key]: selected.trim()
    }));
    window.getSelection().removeAllRanges();
  }

  function handleInputChange(key, value) {
    setTags(prev => ({
      ...prev,
      [key]: value
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
    <div>
      {/* Info */}
      <div className="card card-compact shadow p-2 mb-3" style={{ background: "#eaf1fb" }}>
        <div className="d-flex align-center gap-1" style={{ fontSize: "0.96rem", color: "#1976d2" }}>
          <Info size={18} />
          <span>
            Prvo odaberite tip dokumenta. Ovisno o tipu, označite ili upišite važne elemente (OIB, EU VAT, VAT, iznos...) u prikazana polja.
          </span>
        </div>
      </div>

      {/* Tip dokumenta */}
      <div className="mb-3 d-flex align-center gap-2">
        <label style={{ minWidth: 120, fontWeight: 600 }}>Tip dokumenta:</label>
        <select
          className="form-select"
          style={{ maxWidth: 240, display: "inline-block" }}
          value={documentType}
          onChange={handleTypeChange}
          disabled={loading}
          aria-label="Tip dokumenta"
        >
          {DOCUMENT_TYPES.map(dt =>
            <option key={dt.key} value={dt.key}>{dt.label}</option>
          )}
        </select>
      </div>

      {/* OCR tekst */}
      <div
        ref={textRef}
        className="mb-3"
        style={{
          whiteSpace: "pre-wrap",
          border: "1.3px solid #eaf1fb",
          padding: "1.1rem",
          minHeight: "160px",
          maxHeight: "300px",
          overflowY: "auto",
          userSelect: "text",
          fontFamily: "monospace",
          fontSize: "1.06rem",
          lineHeight: "1.45",
          background: "#fff",
          borderRadius: "10px",
        }}
        tabIndex={0}
      >
        {text}
      </div>

      {/* Dinamička forma */}
      <div className="d-flex flex-column gap-2 mb-3">
        {TAG_TYPES.filter(t => activeFields.includes(t.key)).map(({ key, label }) => (
          <div className="d-flex align-center gap-1" key={key}>
            <label style={{ minWidth: 150 }}>{label}:</label>
            <input
              className="form-control"
              style={{ maxWidth: 240 }}
              value={tags[key] || ""}
              onChange={e => handleInputChange(key, e.target.value)}
              placeholder={`Upiši ili označi ${label.toLowerCase()}`}
              disabled={loading}
              aria-label={label}
            />
            <button
              className="btn btn-secondary btn-xs"
              type="button"
              style={{ minWidth: 102 }}
              onClick={() => handleQuickTag(key)}
              disabled={loading}
              aria-label={`Preuzmi selekciju za ${label}`}
              title={`Preuzmi selekciju za ${label}`}
            >
              Preuzmi selekciju
            </button>
            {tags[key] && (
              <button
                className="btn btn-danger btn-xs"
                type="button"
                title="Obriši polje"
                onClick={() => handleRemove(key)}
                disabled={loading}
                aria-label={`Obriši polje ${label}`}
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary mt-2"
        style={{ minWidth: 130 }}
        onClick={handleSave}
        disabled={loading || !tags.document_type}
        aria-label="Spremi oznake"
      >
        {loading ? "Spremanje..." : "Spremi oznake"}
      </button>
    </div>
  );
}
