import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import OcrTextTagger from "./OcrTextTagger";
import PdfViewer from "./PdfViewer";
import { toast } from "react-toastify";

function StructuredParsedView({ parsed }) {
  if (!parsed) return <div>Nema podataka za prikaz.</div>;

  const fieldLabels = {
    document_type: "Tip dokumenta",
    invoice_number: "Broj računa",
    date_invoice: "Datum računa",
    due_date: "Datum dospijeća",
    amount: "Iznos",
    oib: "OIB",
    supplier_name_ocr: "Dobavljač",
    supplier_oib: "OIB dobavljača",
    vat_number: "VAT broj",
    partner_name: "Naziv partnera",
  };

  return (
    <div style={{ padding: 20, border: "1px solid #ccc", borderRadius: 8, maxWidth: 700 }}>
      <h3>Detalji dokumenta (strukturirani prikaz)</h3>
      <table>
        <tbody>
          {Object.entries(parsed).map(([key, value]) => (
            <tr key={key}>
              <td style={{ fontWeight: "bold", paddingRight: 10, verticalAlign: "top" }}>
                {fieldLabels[key] || key.replace(/_/g, " ")}
              </td>
              <td style={{ whiteSpace: "pre-wrap" }}>{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const idsStr = params.get("ids");
  const ids = idsStr ? idsStr.split(",").map(Number) : [];
  const currentIdx = ids.indexOf(Number(id));
  const prevId = currentIdx > 0 ? ids[currentIdx - 1] : null;
  const nextId = currentIdx !== -1 && currentIdx < ids.length - 1 ? ids[currentIdx + 1] : null;

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

        setInitialTags({
          document_type: data.document_type,
          invoice_number: data.doc_number,
          date_invoice: data.invoice_date,
          due_date: data.due_date,
          amount: data.amount,
          oib: data.supplier_oib,
          supplier_name_ocr: data.supplier_name_ocr,
          supplier_oib: data.supplier_oib,
          partner_name: data.partner_name || "",
          vat_number: "",
        });
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

  if (loading) {
    return (
      <div className="container mt-2">
        <div className="card p-2 text-center">Učitavanje dokumenta...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mt-2">
        <div className="card p-2 text-center">Dokument nije pronađen.</div>
      </div>
    );
  }

  const isManualUpload = document.import_source === "manual_upload";

  if (isManualUpload && document.parsed && Object.keys(document.parsed).length > 0) {
    return (
      <div className="container mt-3 document-detail-page">
        <StructuredParsedView parsed={document.parsed} />
      </div>
    );
  }

  // Inače klasični prikaz (pdf + ocr + anotacije)
  return (
    <div className="container mt-3 document-detail-page">
      <div className="d-flex justify-between align-center mb-3">
        <h2 className="fw-bold">
          Dokument: <span className="fw-medium">{document.filename}</span>
        </h2>
        {document.document_type && (
          <span className={`badge ${document.document_type?.toLowerCase()}`}>{document.document_type}</span>
        )}
      </div>

      {/* Navigacijske strelice */}
      {ids.length > 0 && (
        <div className="mb-3 d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            disabled={prevId === null}
            onClick={() => navigate(`/documents/${prevId}?ids=${idsStr}`)}
          >
            ← Prethodni
          </button>
          <button
            className="btn btn-outline-secondary"
            disabled={nextId === null}
            onClick={() => navigate(`/documents/${nextId}?ids=${idsStr}`)}
          >
            Sljedeći →
          </button>
        </div>
      )}

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
              ? typeof document.sudreg_response === "object"
                ? JSON.stringify(document.sudreg_response, null, 2)
                : document.sudreg_response
              : "Nema dostupnih podataka iz Sudskog registra."}
          </pre>
        </div>
      </div>
    </div>
  );
}
