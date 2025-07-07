import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

// Definicija tipova tagova koje korisnik može označiti
const TAG_TYPES = [
  { key: "oib", label: "OIB" },
  { key: "invoice_number", label: "Broj računa" },
  { key: "date_invoice", label: "Datum računa" },
  { key: "amount_total", label: "Iznos" },
  { key: "supplier_name", label: "Naziv dobavljača" },
];

export default function OcrTextTagger({ text, initialTags = [], onSave }) {
  const [tags, setTags] = useState(initialTags);
  const textRef = useRef(null);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  function getSelectionIndices() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!textRef.current.contains(range.commonAncestorContainer)) return null;

    const preRange = document.createRange();
    preRange.selectNodeContents(textRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);

    const start = preRange.toString().length;
    const selectedText = selection.toString();
    const end = start + selectedText.length;

    return { start, end };
  }

  function handleTag(type) {
    const indices = getSelectionIndices();
    if (!indices) {
      alert("Selektirajte tekst unutar prikazanog područja prije označavanja.");
      return;
    }

    const selectedText = text.slice(indices.start, indices.end);
    setTags((prev) => [...prev, { type, ...indices, value: selectedText }]);
    window.getSelection().removeAllRanges();
  }

  function removeTag(index) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  function renderTextWithHighlights() {
    if (tags.length === 0) return text;

    const sortedTags = [...tags].sort((a, b) => a.start - b.start);

    let result = [];
    let lastIndex = 0;

    sortedTags.forEach(({ start, end, type }, i) => {
      if (lastIndex < start) {
        result.push(text.slice(lastIndex, start));
      }

      result.push(
        <span
          key={"tag-" + i}
          style={{
            backgroundColor: "#ffff99",
            cursor: "pointer",
            borderBottom: "2px solid orange",
          }}
          title={TAG_TYPES.find((t) => t.key === type)?.label || type}
        >
          {text.slice(start, end)}
        </span>
      );
      lastIndex = end;
    });

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result;
  }

  return (
    <div>
      {/* Info uputa */}
      <div className="alert alert-info d-flex align-items-center" style={{ fontSize: "0.9rem" }}>
        <Info size={18} className="me-2" />
        Ako automatski OCR očitanje nije bilo precizno, označite važne elemente (OIB, iznos...) i kliknite odgovarajuću tipku, zatim spremite oznake.
      </div>

      {/* Prikaz teksta s oznakama */}
      <div
        ref={textRef}
        style={{
          whiteSpace: "pre-wrap",
          border: "1px solid #ddd",
          padding: "12px",
          minHeight: "180px",
          maxHeight: "300px",
          overflowY: "auto",
          userSelect: "text",
          fontFamily: "monospace",
          fontSize: "16px",
          lineHeight: "1.4",
          backgroundColor: "#fff",
          borderRadius: "6px",
        }}
        tabIndex={0}
      >
        {renderTextWithHighlights()}
      </div>

      {/* Tipke za tagiranje */}
      <div className="mt-3 d-flex flex-wrap gap-2">
        {TAG_TYPES.map(({ key, label }) => (
          <button
            key={key}
            className="btn-tag"
            onClick={() => handleTag(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Popis označenih polja */}
      <div className="mt-4">
        <h6>Označena polja:</h6>
        {tags.length === 0 ? (
          <p className="text-muted">Nema označenih polja.</p>
        ) : (
          <ul className="list-group">
            {tags.map(({ type, value }, i) => (
              <li
                key={i}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{TAG_TYPES.find((t) => t.key === type)?.label}:</strong>{" "}
                  {value}
                </div>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeTag(i)}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Gumb za spremanje */}
      <button
        className="btn btn-primary mt-3"
        onClick={() => onSave && onSave(tags)}
        disabled={tags.length === 0}
      >
        Spremi oznake
      </button>
    </div>
  );
}
