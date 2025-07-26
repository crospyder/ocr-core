import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OcrTextTagger from "./OcrTextTagger";
import PdfViewer from "./PdfViewer";
import { toast } from "react-toastify";

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

        // Fetch annotations
        const ares = await fetch(`/api/annotations/${id}`);
        if (ares.ok) {
          const ann = await ares.json();
          let annTags = ann.annotations || {};

          // Map amount_total to amount and remove amount_total key
          if ("amount_total" in annTags) {
            annTags.amount = annTags.amount_total;
            delete annTags.amount_total;
          }

          setInitialTags(annTags);
          console.log("📥 Dohvaćene oznake:", annTags);
        } else {
          setInitialTags({});
          console.log("ℹ️ Nema oznaka za dokument.");
        }
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  async function handleSaveTags(tags) {
    setSaving(true);
    try {
      let amountStr = tags.amount || "";
      amountStr = amountStr.toString().replace(/\./g, "").replace(",", ".");
      let amountNum = parseFloat(amountStr);
      const amount = !isNaN(amountNum) ? amountNum : 0;

      const filteredTags = {
        document_type: tags.document_type,
        invoice_number: tags.invoice_number,
        date_invoice: tags.date_invoice,
        date_valute: tags.date_valute, // Dodano polje datum valute
        amount: amount,
        oib: tags.oib,
        supplier_name_ocr: tags.supplier_name_ocr,
        supplier_oib: tags.supplier_oib,
        partner_name: tags.partner_name,
      };

      console.log("📤 Sending to backend:", filteredTags);

      const res = await fetch(`/api/annotations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filteredTags),
      });

      if (!res.ok) throw new Error("Greška pri spremanju oznaka");

      toast.success("Oznake su spremljene!");

      const docUpdateRes = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filteredTags),
      });

      if (docUpdateRes.ok) {
        toast.success("Dokument je ažuriran");
        console.log("💾 Dokument je ažuriran");
      } else {
        throw new Error("Greška pri ažuriranju dokumenta");
      }

      setInitialTags(filteredTags);
      console.log("💾 Oznake spremljene:", filteredTags);
    } catch (e) {
      toast.error(e.message);
      console.error("❌ Spremanje oznaka nije uspjelo:", e);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="container mt-2">
        <div className="card p-2 text-center">
          <span>Učitavanje dokumenta...</span>
        </div>
      </div>
    );

  if (!document)
    return (
      <div className="container mt-2">
        <div className="card p-2 text-center">
          <span className="text-danger">Dokument nije pronađen.</span>
        </div>
      </div>
    );

  return (
    <div className="container mt-2">
      <div className="d-flex align-center mb-2">
        <h2 className="fw-bold document-title">
          Dokument: <span className="fw-medium document-filename">{document.filename}</span>
        </h2>
        {document.document_type && (
          <span className={`badge ${document.document_type?.toLowerCase()}`}>
            {document.document_type}
          </span>
        )}
      </div>

      <div className="document-main-row">
        <div className="card flex-column document-ocr">
          <div>
            <h5 className="fw-bold mb-2">Sirovo OCR očitanje</h5>
            <div className="badge badge-warning mb-2 ocr-instruction">
              Ako automatski OCR nije bio precizan, označite važne elemente (OIB, iznos…) i kliknite odgovarajuću tipku, zatim spremite oznake.
            </div>
            <OcrTextTagger
              text={document.ocrresult || ""}
              onSave={handleSaveTags}
              initialTags={initialTags}
              loading={saving}
              className="ocr-text-tagger"
            />
            <div className="mt-1 current-tags">
              <b>Trenutne oznake:</b>
              <pre className="tags-pre">{JSON.stringify(initialTags, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="card flex-column document-pdf">
          <h5 className="fw-bold mb-2">Pregled dokumenta (PDF)</h5>
          <div className="pdf-viewer-wrapper">
            <PdfViewer
              fileUrl={`/api/documents/${id}/file`}
              className="pdf-viewer"
            />
          </div>
        </div>
      </div>

      <div className="card p-2 mb-2 sudreg-card">
        <h5 className="fw-bold">RAW odgovor iz Sudskog registra</h5>
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
