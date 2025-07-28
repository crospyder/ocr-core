// BatchUploadModal.jsx
import React, { useState } from "react";
import axios from "axios";

export default function BatchUploadModal({ files, onClose }) {
  const [fileList, setFileList] = useState(files);
  const [documentType, setDocumentType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  const removeFile = (index) => {
    if (uploading) return;
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("document_type", documentType || "ULAZNI");

    try {
      const response = await axios.post("/api/upload/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return { error: error.message || "Greška pri uploadu" };
    }
  };

  const startUpload = async () => {
    setUploading(true);
    setResults([]);
    setDuplicates([]);
    setCurrentIndex(0);

    for (let i = 0; i < fileList.length; i++) {
      setCurrentIndex(i);
      const file = fileList[i];
      const res = await uploadSingleFile(file);

      if (res.processed && res.processed.length > 0) {
        res.processed.forEach((doc) => {
          if (doc.status === "DUPLICATE") {
            setDuplicates((d) => [...d, doc.filename || file.name]);
          }
        });
      }
      setResults((r) => [...r, { filename: file.name, response: res }]);
    }

    setUploading(false);
    setCurrentIndex(-1);
  };

  const progressText = () => {
    if (!uploading) return "";
    return `Obrađujem dokument ${currentIndex + 1} od ${fileList.length}...`;
  };

  return (
    <>
      <div className="modal-backdrop" />
      <div className="modal-card">
        <div className="modal-header d-flex justify-between align-center">
          <h4 className="modal-title mb-0">BATCH UPLOAD DOKUMENATA</h4>
          <button
            className="modal-close"
            onClick={() => !uploading && onClose()}
            disabled={uploading}
            aria-label="Zatvori"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {!uploading && (
            <div className="mb-3">
              <label className="fw-bold mb-1">Vrsta dokumenta za sve dokumente:</label>
              <select
                className="form-select"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={uploading}
              >
                <option value="">-- odaberi tip --</option>
                <option value="IRA">Izlazni račun (IRA)</option>
                <option value="ULAZNI">Ulazni dokumenti (automatsko prepoznavanje)</option>
              </select>
            </div>
          )}

          {!uploading && (
            <>
              <p className="fw-medium mb-1">Pregled odabranih dokumenata:</p>
              <ul className="file-list mb-3">
                {fileList.length === 0 && <li className="text-muted">Lista prazna</li>}
                {fileList.map((file, i) => (
                  <li key={i} className="d-flex justify-between align-center mb-1">
                    <span>{file.name}</span>
                    <button
                      className="btn-remove"
                      onClick={() => removeFile(i)}
                      aria-label={`Izbaci ovaj dokument iz obrade`}
                      disabled={uploading}
                      title="Izbaci ovaj dokument iz obrade"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {uploading && (
            <div>
              <p>{progressText()}</p>
              <progress max={fileList.length} value={currentIndex + 1} className="upload-progress" />
            </div>
          )}

          {!uploading && results.length > 0 && (
            <div>
              <h5>Izvještaj uploada:</h5>
              <p>Ukupno dokumenata: {results.length}</p>
              <p>Duplikati preskočeni:</p>
              {duplicates.length === 0 ? (
                <p className="text-muted">Nema duplikata</p>
              ) : (
                <ul>
                  {duplicates.map((dup, i) => (
                    <li key={i}>{dup}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer d-flex justify-between">
          {!uploading && results.length === 0 && (
            <>
              <button className="btn btn-secondary" onClick={() => onClose()} disabled={uploading}>
                Odustani
              </button>
              <button
                className="btn btn-primary"
                onClick={startUpload}
                disabled={fileList.length === 0 || !documentType}
              >
                Pokreni upload
              </button>
            </>
          )}

          {uploading && (
            <button className="btn btn-warning" disabled>
              Upload u tijeku...
            </button>
          )}

          {!uploading && results.length > 0 && (
            <button className="btn btn-success" onClick={() => onClose()}>
              OK
            </button>
          )}
        </div>
      </div>
    </>
  );
}
