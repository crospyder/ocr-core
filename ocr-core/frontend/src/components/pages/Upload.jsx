import React from "react";
import DocumentsUpload from "../DocumentsUpload.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const navigate = useNavigate();

  const handleUploadComplete = (result) => {
    if (result && result.documents) {
      toast.success("✅ Upload uspješno završen!");

      // Prikaz upozorenja ako ih ima u bilo kojem dokumentu
      result.documents.forEach(doc => {
        if (doc.validation_alert) {
          toast.warn(`Upozorenje za dokument ${doc.original_filename}: ${doc.validation_alert}`);
        }
      });

      const uploadedIds = result.uploadedIds || result.documents.map(d => d.id);

      navigate("/documents", { state: { justUploaded: true, uploadedIds } });
    } else {
      toast.error("❌ Došlo je do greške tijekom uploada!");
    }
  };

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

      <DocumentsUpload onUploadComplete={handleUploadComplete} />
    </div>
  );
}
