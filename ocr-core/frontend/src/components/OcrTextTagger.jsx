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
  { key: "amount_total", label: "Iznos" },
  { key: "supplier_name", label: "Naziv dobavljača" },
  { key: "partner_name", label: "Naziv partnera" },
];

// Koja polja prikazati za tip dokumenta
const fieldsForType = {
  URA: ["supplier_name", "amount_total", "date_invoice", "invoice_number", "oib", "euvat", "vat"],
  IRA: ["partner_name", "amount_total", "date_invoice", "invoice_number", "oib", "euvat", "vat"],
  IZVOD: ["amount_total", "date_invoice", "oib", "euvat", "vat"],
  UGOVOR: ["partner_name", "date_invoice", "oib", "euvat", "vat"],
  OSTALO: ["oib", "euvat", "vat"],
};

export default function OcrTextTagger({ text, initialTags = {}, onSave, loading }) {
  const [tags, setTags] = useState(initialTags);
  const textRef = useRef(null);

  // Sync s propom (za editanje dokumenata!)
  useEffect(() => {
    setTags(initialTags || {});
  }, [initialTags]);

  // Uvijek radi controlled dropdown/inpute
  const documentType = tags.document_type || "OSTALO";
  const activeFields = fieldsForType[documentType] || [];

  // Helper za selektiranje iz OCR tekst prikaza
  function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return "";
    const range = selection.getRangeAt(0);
    if (!textRef.current.contains(range.commonAncestorContainer)) return "";
    return selection.toString();
  }

  // Autofill polja iz selekcije
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

  // Ručno editiranje
  function handleInputChange(key, value) {
    setTags(prev => ({
      ...prev,
      [key]: value
    }));
  }

  // Obriši polje
  function handleRemove(key) {
    setTags(prev => {
      const c = { ...prev };
      delete c[key];
      return c;
    });
  }

  // Tip dokumenta - kad promjeniš, resetiraj i polja koja nisu dio tog tipa
  function handleTypeChange(e) {
    const value = e.target.value;
    setTags(prev => {
      // Resetiraj stare fieldove koji nisu u activeFields novog tipa
      const cleaned = { document_type: value };
      for (const key of fieldsForType[value] || []) {
        if (prev[key]) cleaned[key] = prev[key];
      }
      return cleaned;
    });
  }

  // Save
  function handleSave() {
    if (onSave) onSave(tags);
  }

  return (
    <div>
      {/* Info */}
      <div className="alert alert-info d-flex align-items-center" style={{ fontSize: "0.9rem" }}>
        <Info size={18} className="me-2" />
        Prvo odaberite tip dokumenta. Ovisno o tipu, označite ili upišite važne elemente (OIB, EU VAT, VAT, iznos...) u prikazana polja.
      </div>

      {/* Tip dokumenta */}
      <div className="mb-3 d-flex align-items-center">
        <label style={{ minWidth: 120, fontWeight: 600 }}>Tip dokumenta:</label>
        <select
          className="form-select form-select-sm mx-2"
          style={{ maxWidth: 240, display: "inline-block" }}
          value={documentType}
          onChange={handleTypeChange}
          disabled={loading}
        >
          {DOCUMENT_TYPES.map(dt =>
            <option key={dt.key} value={dt.key}>{dt.label}</option>
          )}
        </select>
      </div>

      {/* OCR tekst */}
      <div
        ref={textRef}
        style={{
          whiteSpace: "pre-wrap",
          border: "1px solid #ddd",
          padding: "12px",
          minHeight: "160px",
          maxHeight: "300px",
          overflowY: "auto",
          userSelect: "text",
          fontFamily: "monospace",
          fontSize: "16px",
          lineHeight: "1.4",
          backgroundColor: "#fff",
          borderRadius: "6px",
          marginBottom: "18px"
        }}
        tabIndex={0}
      >
        {text}
      </div>

      {/* Dinamička forma */}
      <div className="row">
        {TAG_TYPES.filter(t => activeFields.includes(t.key)).map(({ key, label }) => (
          <div className="col-12 mb-2 d-flex align-items-center" key={key}>
            <label style={{ minWidth: 150 }}>{label}:</label>
            <input
              className="form-control form-control-sm mx-2"
              style={{ maxWidth: 240 }}
              value={tags[key] || ""}
              onChange={e => handleInputChange(key, e.target.value)}
              placeholder={`Upiši ili označi ${label.toLowerCase()}`}
              disabled={loading}
            />
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              style={{ minWidth: 110 }}
              onClick={() => handleQuickTag(key)}
              disabled={loading}
            >
              Preuzmi selekciju
            </button>
            {tags[key] && (
              <button
                className="btn btn-outline-danger btn-sm ms-2"
                type="button"
                title="Obriši polje"
                onClick={() => handleRemove(key)}
                disabled={loading}
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary mt-4"
        style={{ minWidth: 130 }}
        onClick={handleSave}
        disabled={loading || !tags.document_type}
      >
        {loading ? "Spremanje..." : "Spremi oznake"}
      </button>
    </div>
  );
}
