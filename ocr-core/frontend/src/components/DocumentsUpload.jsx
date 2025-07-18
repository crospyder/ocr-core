import React, { useState, useRef } from "react";
import LoadingModal from "./LoadingModal.jsx";
import { toast } from "react-toastify";
import { FileText } from "lucide-react";

export default function DocumentsUpload({ onFilesSelected, onDebug }) {
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

    // Proslijedi datoteke prema roditelju
    if (onFilesSelected) {
      onFilesSelected(pdfFiles);
    }
  }

  function handleDocTypeChange(e) {
    setDocType(e.target.value);
  }

  // Ukloni gumb za upload - upload radimo u BatchUploadModal
  return (
    <>
      <LoadingModal visible={loading} message="Uploading and OCR processing..." />
      <div className="pantheon-upload-card shadow-lg p-4 mb-4">
        <h2 className="fw-bold mb-2 text-center page-title" style={{color:'#232d39'}}>Odaberi dokumente za OCR obradu</h2>
        <p className="text-muted text-center mb-4 fst-italic">Pošalji nove PDF dokumente za OCR obradu.<br/>Sve datoteke su sigurno pohranjene na serveru.</p>
        
        {/* Tip dokumenta */}
        <label className="form-label fw-semibold mb-2" htmlFor="doctype">Tip dokumenta</label>
        <select
          id="doctype"
          className="form-select mb-4"
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

        {/* Odabir foldera */}
        <button
          type="button"
          onClick={() => inputFolderRef.current && inputFolderRef.current.click()}
          disabled={loading}
          className="pantheon-upload-btn primary w-100 mb-2 d-flex align-items-center justify-content-center"
          style={{fontWeight:600, fontSize:'1.08rem'}}
        >
          <FileText size={22} className="me-2" /> Odaberi folder s PDF dokumentima
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

        {/* Odabir pojedinačnih */}
        <button
          type="button"
          onClick={() => inputFileRef.current && inputFileRef.current.click()}
          disabled={loading}
          className="pantheon-upload-btn secondary w-100 mb-3 d-flex align-items-center justify-content-center"
          style={{fontWeight:600, fontSize:'1.08rem'}}
        >
          <FileText size={22} className="me-2" /> Odaberi PDF datoteku
        </button>
        <input
          type="file"
          className="d-none"
          onChange={handleFilesChange}
          disabled={loading}
          ref={inputFileRef}
          accept=".pdf"
        />

        {/* Pregled odabranih */}
        {files.length > 0 && (
          <div className="pantheon-upload-files-list mb-3">
            <h6 className="fw-bold mb-2">
              <FileText size={17} className="me-1" /> Odabrane PDF datoteke:
            </h6>
            <ul className="list-unstyled mb-0" style={{fontSize:'0.97em'}}>
              {files.map((file, idx) => (
                <li key={idx} className="d-flex align-items-center">
                  <FileText size={14} className="me-1" /> 
                  <span className="me-2">{file.webkitRelativePath || file.name}</span>
                  <span className="text-secondary">({(file.size/1024).toFixed(2)} KB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
