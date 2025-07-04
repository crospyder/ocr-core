import React, { useState, useRef, useEffect } from "react";

// Definicija tipova tagova koje korisnik može označiti
const TAG_TYPES = [
  { key: "oib", label: "OIB" },
  { key: "invoice_number", label: "Broj računa" },
  { key: "date_invoice", label: "Datum računa" },
  { key: "amount_total", label: "Iznos" },
  { key: "supplier_name", label: "Naziv dobavljača" },
];

export default function OcrTextTagger({ text, initialTags = [], onSave }) {
  // Početno stanje tagova iz propsa
  const [tags, setTags] = useState(initialTags);
  const textRef = useRef(null);

  // Kad se promijeni initialTags (npr. dohvaćene anotacije), update state
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  // Dohvati indeks početka i kraja selektiranog teksta unutar prikazanog teksta
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


  // Handler za označavanje selektiranog teksta kao određeni tip taga
  function handleTag(type) {
    const indices = getSelectionIndices();
    if (!indices) {
      alert("Selektirajte tekst unutar prikazanog područja prije označavanja.");
      return;
    }

    const selectedText = text.slice(indices.start, indices.end);

    // Dodajemo novi tag u listu
    setTags((prev) => [...prev, { type, ...indices, value: selectedText }]);

    // Resetiramo selekciju u pregledniku
    window.getSelection().removeAllRanges();
  }

  // Brisanje taga po indeksu
  function removeTag(index) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  // Render teksta s označenim dijelovima (highlight)
  function renderTextWithHighlights() {
    if (tags.length === 0) return text;

    // Sortiramo tagove po početnom indeksu radi pravilnog prikaza
    const sortedTags = [...tags].sort((a, b) => a.start - b.start);

    let result = [];
    let lastIndex = 0;

    sortedTags.forEach(({ start, end, type }, i) => {
      // Dodajemo tekst prije taga
      if (lastIndex < start) {
        result.push(text.slice(lastIndex, start));
      }
      // Dodajemo označeni tekst s pozadinskim osvjetljenjem
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

    // Dodajemo ostatak teksta nakon zadnjeg taga
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result;
  }

  return (
    <div>
      <h5>OCR tekst - označite tekst i kliknite na tipku za tagiranje</h5>
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
          fontSize: "14px",
          lineHeight: "1.4",
        }}
        tabIndex={0} // da div može primiti fokus i selekciju
      >
        {renderTextWithHighlights()}
      </div>

      <div className="mt-3">
        {TAG_TYPES.map(({ key, label }) => (
          <button
            key={key}
            className="btn btn-sm btn-outline-primary me-2 mb-2"
            onClick={() => handleTag(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <h6>Označena polja:</h6>
        {tags.length === 0 && <p>Nema označenih polja.</p>}
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
      </div>

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
