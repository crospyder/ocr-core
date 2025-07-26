// Updated DocumentDetail.jsx with layout separation
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

        const ares = await fetch(`/api/annotations/${id}`);
        if (ares.ok) {
          const ann = await ares.json();
          let annTags = ann.annotations || {};
          if ("amount_total" in annTags) {
            annTags.amount = annTags.amount_total;
            delete annTags.amount_total;
          }
          setInitialTags(annTags);
        } else {
          setInitialTags({});
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
        date_valute: tags.date_valute,
        due_date: tags.due_date,
        amount: amount,
        oib: tags.oib,
        supplier_name_ocr: tags.supplier_name_ocr,
        supplier_oib: tags.supplier_oib,
        partner_name: tags.partner_name,
      };

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

      if (!docUpdateRes.ok) throw new Error("Greška pri ažuriranju dokumenta");

      toast.success("Dokument je ažuriran");
      setInitialTags(filteredTags);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !document) {
    return (
      <div className="container mt-2">
        <div className="card p-2 text-center">
          <span>{loading ? "Učitavanje dokumenta..." : "Dokument nije pronađen."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-3 document-detail-page">
      <div className="d-flex justify-between align-center mb-3">
        <h2 className="fw-bold">Dokument: <span className="fw-medium">{document.filename}</span></h2>
        {document.document_type && (
          <span className={`badge ${document.document_type?.toLowerCase()}`}>{document.document_type}</span>
        )}
      </div>

      <div className="ocr-annotator mb-4">
        <OcrTextTagger
          text={document.ocrresult || ""}
          onSave={handleSaveTags}
          initialTags={initialTags}
          loading={saving}
        />
      </div>

      <div className="d-flex gap-3 mb-4">
        <div className="pdf-container">
          <h5 className="fw-bold mb-2">Pregled dokumenta (PDF)</h5>
          <PdfViewer fileUrl={`/api/documents/${id}/file`} />
        </div>
        <div className="sudreg-container">
          <h5 className="fw-bold mb-2">RAW odgovor iz Sudskog registra</h5>
          <pre style={{ fontSize: "0.9rem" }}>
            {document.sudreg_response
              ? (typeof document.sudreg_response === "object"
                  ? JSON.stringify(document.sudreg_response, null, 2)
                  : document.sudreg_response)
              : "Nema dostupnih podataka iz Sudskog registra."}
          </pre>
        </div>
      </div>
    </div>
  );
}
