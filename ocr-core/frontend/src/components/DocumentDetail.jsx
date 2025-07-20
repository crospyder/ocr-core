// src/pages/DocumentDetail.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OcrTextTagger from "./OcrTextTagger";
import PdfViewer from "./PdfViewer";

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialTags, setInitialTags] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDocument() {
      setLoading(true);
      try {
        const res = await fetch(`/api/documents/${id}`);
        if (!res.ok) throw new Error("Ne mogu dohvatiti dokument");
        const data = await res.json();
        setDocument(data);
        // fetch annotations
        const ares = await fetch(`/api/annotations/${id}`);
        if (ares.ok) {
          const ann = await ares.json();
          setInitialTags(ann.annotations || {});
          console.log("📥 Dohvaćene oznake:", ann.annotations || {});
        } else {
          setInitialTags({});
          console.log("ℹ️ Nema oznaka za dokument.");
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
    setSaving(true);
    try {
      const res = await fetch(`/api/annotations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tags),
      });
      if (!res.ok) throw new Error("Greška pri spremanju oznaka");
      alert("Oznake su spremljene!");
      setInitialTags(tags);
      console.log("💾 Oznake spremljene:", tags);
    } catch (e) {
      alert(e.message);
      console.error("❌ Spremanje oznaka nije uspjelo:", e);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="container mt-4"><p>Učitavanje dokumenta...</p></div>;
  if (!document)
    return (
      <div className="container mt-4">
        <p className="text-danger">Dokument nije pronađen.</p>
      </div>
    );

  return (
    <div className="container-fluid px-4 mt-4">
      <div className="d-flex align-items-center mb-4">
        <h2 className="document-title flex-grow-1">
          Dokument: <span style={{ color: "#15396e" }}>{document.filename}</span>
        </h2>
        <span className={`doc-tag ${document.document_type?.toLowerCase() || ""}`}>
          {document.document_type}
        </span>
      </div>

      <div className="row mb-4" style={{ minHeight: "72vh" }}>
        {/* Lijevo: OCR tagger */}
        <div className="col-md-5 d-flex flex-column">
          <div className="border rounded shadow-sm bg-light p-3 flex-grow-1 d-flex flex-column justify-content-between" style={{ minHeight: 480 }}>
            <div>
              <h5 className="mb-3" style={{ color: "#15396e" }}>Sirovo OCR očitanje</h5>
              <div className="alert alert-info py-2 px-3 mb-3 small" style={{ fontSize: "0.96rem" }}>
                Ako automatski OCR nije bio precizan, označite važne elemente (OIB, iznos…) i kliknite odgovarajuću tipku, zatim spremite oznake.
              </div>
              <OcrTextTagger
                text={document.ocrresult || ""}
                onSave={handleSaveTags}
                initialTags={initialTags}
                loading={saving}
                style={{ flexGrow: 1, overflowY: "auto", minHeight: 280 }}
              />
              <div className="mt-2 small">
                <b>Trenutne oznake:</b>
                <pre style={{ background: "#f8f9fa", border: "1px solid #ececec", borderRadius: 4, padding: 8, minHeight: 56 }}>
                  {JSON.stringify(initialTags, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Desno: PDF prikaz */}
        <div className="col-md-7 d-flex flex-column mb-3">
          <div className="border rounded shadow-sm bg-white p-3 flex-grow-1 d-flex flex-column" style={{ minHeight: 480 }}>
            <h5 className="mb-3" style={{ color: "#15396e" }}>Pregled dokumenta (PDF)</h5>
            <div className="flex-grow-1" style={{ minHeight: 380, minWidth: 300 }}>
              <PdfViewer
                fileUrl={`/api/documents/${id}/file`}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sudreg output - jasna odvojena sekcija */}
      <div className="border rounded shadow-sm p-3 bg-white mb-5" style={{ maxWidth: 1000 }}>
        <h5 className="sudreg-header" style={{ color: "#15396e" }}>RAW odgovor iz Sudskog registra</h5>
        <pre className="sudreg-pre small" style={{ background: "#f8f9fa", border: "1px solid #ececec", borderRadius: 4, padding: 12 }}>
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
