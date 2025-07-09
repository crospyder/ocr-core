import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OcrTextTagger from "./OcrTextTagger";
import PdfViewer from "./PdfViewer";

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialTags, setInitialTags] = useState([]);

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
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

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

  if (loading) return <p className="mt-4">Učitavanje dokumenta...</p>;
  if (!document) return <p className="mt-4 text-danger">Dokument nije pronađen.</p>;

  return (
    <div className="container mt-4">
      <h2 className="document-title mb-4">Dokument: {document.filename}</h2>

      <div className="row mb-4" style={{ height: "80vh" }}>
        {/* Lijevo: OCR tagger na ~40% */}
        <div className="col-md-4 d-flex flex-column">
          <div className="h-100 border rounded shadow-sm p-3 bg-light flex-grow-1 d-flex flex-column">
            <h5 className="mb-3">Sirovo OCR očitanje</h5>
            <OcrTextTagger
              text={document.ocrresult || ""}
              onSave={handleSaveTags}
              initialTags={initialTags}
              style={{ flexGrow: 1, overflowY: "auto" }}
            />
          </div>
        </div>

        {/* Desno: PDF prikaz na 60% */}
        <div className="col-md-8 mb-3 d-flex flex-column">
          <div className="h-100 border rounded shadow-sm p-2 bg-white flex-grow-1 d-flex flex-column">
            <h5 className="mb-2">Pregled dokumenta (PDF)</h5>
            <div style={{ flexGrow: 1, minHeight: 0 }}>
              <PdfViewer
                fileUrl={`/api/documents/${id}/file`}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sudreg output - jasna odvojena sekcija */}
      <div className="border rounded shadow-sm p-3 bg-white mb-5">
        <h5 className="sudreg-header">RAW odgovor iz Sudskog registra</h5>
        <pre className="sudreg-pre">
          {document.sudreg_response
            ? (typeof document.sudreg_response === "object"
                ? JSON.stringify(document.sudreg_response, null, 2)
                : document.sudreg_response)
            : "Nema dostupnih podataka iz Sudskog registra."}
        </pre>
      </div>
    </div>
  );
}
