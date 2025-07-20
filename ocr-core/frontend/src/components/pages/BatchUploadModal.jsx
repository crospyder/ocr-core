import React, { useState } from "react";
import axios from "axios";

export default function BatchUploadModal({ files, onClose }) {
  const [fileList, setFileList] = useState(files);
  const [documentType, setDocumentType] = useState(""); // NOVO: tip dokumenta za sve
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  // Ukloni fajl iz liste
  const removeFile = (index) => {
    if (uploading) return;
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload jednog fajla (poziva API)
  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append("files", file);
    formData.append("document_type", documentType || "OSTALO"); // koristi state

    try {
      const response = await axios.post("/api/upload/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return { error: error.message || "Greška pri uploadu" };
    }
  };

  // Pokretanje batch uploada
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
        res.processed.forEach(doc => {
          if (doc.status === "DUPLICATE") {
            setDuplicates(d => [...d, doc.filename || file.name]);
          }
        });
      }
      setResults(r => [...r, { filename: file.name, response: res }]);
    }

    setUploading(false);
    setCurrentIndex(-1);
  };

  // Format progres teksta
  const progressText = () => {
    if (!uploading) return "";
    return `Obrađujem dokument ${currentIndex + 1} od ${fileList.length}...`;
  };

  return (
    <>
      <div className="modal-backdrop"></div>
      <div className="modal d-flex align-items-center justify-content-center">
        <div className="modal-card" style={{ maxWidth: 600, width: "90%" }}>
          <div className="modal-header d-flex justify-content-between align-items-center">
            <h4 className="modal-title">Batch upload dokumenata</h4>
            <button
              className="modal-close"
              onClick={() => !uploading && onClose()}
              disabled={uploading}
              aria-label="Zatvori"
            >
              &times;
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: "50vh", overflowY: "auto" }}>
            {/* DODANO: Izbor vrste dokumenta */}
            {!uploading && (
              <div className="mb-3">
                <label>Vrsta dokumenta za sve dokumente:</label>
                <select
                  className="form-select"
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">-- odaberi tip --</option>
                  <option value="URA">Ulazni račun (URA)</option>
                  <option value="IRA">Izlazni račun (IRA)</option>
                  <option value="IZVOD">Izvod</option>
                  <option value="UGOVOR">Ugovor</option>
                  <option value="OSTALO">Ostalo</option>
                </select>
              </div>
            )}

            {!uploading && (
              <>
                <p>Pregled odabranih dokumenata:</p>
                <ul className="file-list" style={{ maxHeight: 250, overflowY: "auto" }}>
                  {fileList.length === 0 && <li>Lista prazna</li>}
                  {fileList.map((file, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{file.name}</span>
                      <button className="btn btn-sm btn-danger" onClick={() => removeFile(i)} aria-label={`Ukloni ${file.name}`}>
                        Ukloni
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {uploading && (
              <div>
                <p>{progressText()}</p>
                <progress
                  max={fileList.length}
                  value={currentIndex + 1}
                  style={{ width: "100%", height: "1.5rem" }}
                />
              </div>
            )}

            {!uploading && results.length > 0 && (
              <div>
                <h5>Izvještaj uploada:</h5>
                <p>Ukupno dokumenata: {results.length}</p>
                <p>Duplikati preskočeni:</p>
                {duplicates.length === 0 ? (
                  <p>Nema duplikata</p>
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

          <div className="modal-footer d-flex justify-content-between">
            {!uploading && results.length === 0 && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => onClose()}
                  disabled={uploading}
                >
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
      </div>
    </>
  );
}
