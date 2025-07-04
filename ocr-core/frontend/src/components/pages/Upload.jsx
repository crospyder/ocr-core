import React from "react";
import DocumentsUpload from "../DocumentsUpload.jsx";

export default function Upload() {
  return (
    <div className="container py-5">
      <header className="mb-4 text-center">
        <h1 className="display-5 fw-bold text-primary">
          Odabir dokumenata za OCR obradu
        </h1>
        <p className="text-secondary fst-italic">
          Pošalji nove dokumente za OCR obradu.
        </p>
      </header>

      <DocumentsUpload
        onUploadComplete={() => {
          alert("Upload završen!");
        }}
      />
    </div>
  );
}
