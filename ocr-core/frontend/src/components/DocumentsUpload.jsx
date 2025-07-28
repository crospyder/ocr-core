import React, { useState, useRef } from "react";
import LoadingModal from "./LoadingModal.jsx";
import { toast } from "react-toastify";
import { Folder, FileText } from "lucide-react";

export default function DocumentsUpload({ onFilesSelected, onDebug }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState(""); // default je prazno = automatska klasifikacija
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

    if (onFilesSelected) {
      onFilesSelected(pdfFiles, docType);
    }
  }

  return (
    <>
      <LoadingModal visible={loading} message="Uploading and OCR processing..." />
      <div className="documents-upload-card">
        <h2 className="documents-upload-title">
          Odaberi dokumente za OCR obradu
        </h2>
        <p className="documents-upload-subtitle">
          Odaberi cijeli folder s dokumentima ili odaberi pojedinačni dokument za daljnju obradu, indeksiranje i pohranu.
        </p>

        {/* NOVO: Dropdown za vrstu dokumenata */}
        <div className="mb-3">
          <label htmlFor="docTypeSelect" className="form-label fw-bold">
            Vrsta dokumenta:
          </label>
          <select
            id="docTypeSelect"
            className="form-select"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            disabled={loading}
          >
            <option value="">Ulazni dokumenti (automatsko prepoznavanje)</option>
            <option value="IRA">Izlazni račun (IRA)</option>
          </select>
        </div>

        <div className="documents-upload-custom-file">
          <input
            type="file"
            id="folderInput"
            className="documents-upload-custom-file-input"
            multiple
            webkitdirectory="true"
            directory=""
            onChange={handleFilesChange}
            disabled={loading}
            ref={inputFolderRef}
            accept=".pdf"
          />
          <label htmlFor="folderInput" className="documents-upload-custom-file-label">
            <Folder size={19} /> Odaberite direktorij s dokumentima
          </label>
        </div>
        <div className="documents-upload-custom-file">
          <input
            type="file"
            id="fileInput"
            className="documents-upload-custom-file-input"
            onChange={handleFilesChange}
            disabled={loading}
            ref={inputFileRef}
            accept=".pdf"
            multiple
          />
          <label htmlFor="fileInput" className="documents-upload-custom-file-label">
            <FileText size={19} /> Odaberi pojedinačnu datoteku
          </label>
        </div>

        <div className="text-muted mb-3 fst-italic text-center">
          {files.length === 0
            ? "Datoteka još nije odabrana"
            : `${files.length} datotek${files.length === 1 ? 'a' : 'e'} dokumenata ćemo poslati na obradu`}
        </div>

        {files.length > 0 && (
          <div className="mb-2">
            <h6 className="fw-bold d-flex align-center">
              <span className="ms-1">Lista dokumenata u pripremi za obradu:</span>
            </h6>
            <ul className="documents-upload-file-list">
              {files.map((file, idx) => (
                <li key={idx} className="d-flex align-center mb-1 documents-upload-file-list-item">
                  <span className="documents-upload-file-index me-2">{idx + 1}.</span>
                  <span className="ms-2 me-2">{file.webkitRelativePath || file.name}</span>
                  <span className="text-muted">({(file.size / 1024).toFixed(2)} KB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
