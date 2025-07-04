import React, { useState, useRef } from "react";
import LoadingModal from "./LoadingModal.jsx";

export default function DocumentsUpload({ onUploadComplete, onDebug }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  function handleFilesChange(e) {
    setFiles(Array.from(e.target.files));
    e.target.value = null;
  }

  async function handleUpload() {
    if (files.length === 0) {
      alert("Odaberi barem jednu datoteku.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      setLoading(true);
      onDebug?.(`📤 Počinjem upload ${files.length} datoteka...`);

      const response = await fetch("/api/upload/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error("Greška kod slanja datoteka: " + text);
      }

      const data = await response.json();
      const count = data?.processed?.length || 0;

      onDebug?.(`✅ Upload uspješan: ${count} datoteka poslano.`);
      alert("Upload uspješan!");
      setFiles([]);
      onUploadComplete?.();
    } catch (error) {
      onDebug?.(`❌ Upload greška: ${error.message}`);
      alert("Greška: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <LoadingModal visible={loading} message="Uploading and OCR processing..." />

      <div className="card shadow p-4 mx-auto" style={{ maxWidth: "640px" }}>
        <label className="form-label fw-semibold mb-3">
          Upload dokumenata
        </label>

        <button
          type="button"
          onClick={() => inputRef.current && inputRef.current.click()}
          disabled={loading}
          className="form-control text-center p-5 border border-primary border-2 bg-light mb-3"
          style={{ cursor: "pointer" }}
        >
          Povucite datoteke ovdje ili kliknite za odabir
        </button>

        <input
          type="file"
          id="file-upload"
          multiple
          className="d-none"
          onChange={handleFilesChange}
          disabled={loading}
          ref={inputRef}
        />

        {files.length > 0 && (
          <div className="mb-3">
            <h6 className="fw-bold">Odabrane datoteke:</h6>
            <ul className="list-group">
              {files.map((file, idx) => (
                <li className="list-group-item" key={idx}>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary mt-3 w-100"
          onClick={handleUpload}
          disabled={loading}
        >
          Pošalji
        </button>
      </div>
    </>
  );
}
