import React, { useState, useRef } from "react";
import LoadingModal from "./LoadingModal.jsx";
import { toast } from "react-toastify";

export default function DocumentsUpload({ onUploadComplete, onDebug }) {
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState("");
  const [loading, setLoading] = useState(false);
  const inputFolderRef = useRef(null);
  const inputFileRef = useRef(null);

  function handleFilesChange(e) {
    const allFiles = Array.from(e.target.files);
    const pdfFiles = allFiles.filter(file =>
      file.name.toLowerCase().endsWith(".pdf")
    );
    if (pdfFiles.length === 0) {
      toast.warn("⚠️ Nema PDF datoteka u odabranom folderu ili datoteci.");
    }
    setFiles(pdfFiles);
    e.target.value = null;
  }

  function handleDocTypeChange(e) {
    setDocType(e.target.value);
  }

  async function handleUpload() {
    if (!docType) {
      toast.warn("⚠️ Molim odaberite tip dokumenta.");
      return;
    }

    if (files.length === 0) {
      toast.warn("⚠️ Odaberi barem jednu PDF datoteku.");
      return;
    }

    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("document_type", docType);

    try {
      setLoading(true);
      onDebug?.(`📤 Počinjem upload ${files.length} PDF datoteka...`);

      const response = await fetch("/api/upload/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error("Greška kod slanja datoteka: " + text);
      }

      const data = await response.json();
      const processedDocs = data?.processed || [];
      const uploadedIds = processedDocs.map(item => item.id);

      processedDocs.forEach(doc => {
        if (doc.validation_alert) {
          toast.warn(`⚠️ ${doc.original_filename}: ${doc.validation_alert}`);
        }
      });

      onDebug?.(`✅ Upload uspješan: ${uploadedIds.length} datoteka poslano.`);
      setFiles([]);
      setDocType("");

      onUploadComplete?.({ success: true, uploadedIds, documents: processedDocs });
    } catch (error) {
      onDebug?.(`❌ Upload greška: ${error.message}`);
      toast.error("❌ Greška: " + error.message);
      onUploadComplete?.({ success: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <LoadingModal visible={loading} message="Uploading and OCR processing..." />

      <div className="pantheon-upload-card">
        <label className="form-label fw-semibold mb-3">Tip dokumenta:</label>
        <select
          className="form-select mb-3"
          value={docType}
          onChange={handleDocTypeChange}
          disabled={loading}
        >
          <option value="">-- odaberite tip --</option>
          <option value="URA">URA</option>
          <option value="IRA">IRA</option>
          <option value="IZVOD">IZVOD</option>
          <option value="UGOVOR">UGOVOR</option>
        </select>

        <label className="form-label fw-semibold mb-1">Upload foldera (PDF dokumenti)</label>
        <button
          type="button"
          onClick={() => inputFolderRef.current && inputFolderRef.current.click()}
          disabled={loading}
          className="pantheon-upload-btn primary w-100 text-center"
        >
          Odaberi folder s PDF dokumentima (uključujući podfoldere)
        </button>
        <input
          type="file"
          multiple
          webkitdirectory="true"
          directory=""
          className="d-none"
          onChange={handleFilesChange}
          disabled={loading}
          ref={inputFolderRef}
          accept=".pdf"
        />

        <label className="form-label fw-semibold mb-1">Ili odaberi pojedinačnu datoteku (PDF)</label>
        <button
          type="button"
          onClick={() => inputFileRef.current && inputFileRef.current.click()}
          disabled={loading}
          className="pantheon-upload-btn secondary w-100 text-center"
        >
          Odaberi pojedinačnu PDF datoteku
        </button>
        <input
          type="file"
          className="d-none"
          onChange={handleFilesChange}
          disabled={loading}
          ref={inputFileRef}
          accept=".pdf"
        />

        {files.length > 0 && (
          <div className="pantheon-upload-files-list mb-3">
            <h6 className="fw-bold mb-2">Odabrane PDF datoteke:</h6>
            <ul className="list-unstyled mb-0">
              {files.map((file, idx) => (
                <li key={idx}>
                  {file.webkitRelativePath || file.name} ({(file.size / 1024).toFixed(2)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="pantheon-upload-btn send w-100"
          onClick={handleUpload}
          disabled={loading}
        >
          Pošalji PDF datoteke
        </button>
      </div>
    </>
  );
}
