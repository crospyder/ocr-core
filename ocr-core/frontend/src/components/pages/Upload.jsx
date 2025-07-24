// #Upload.jsx
import React, { useState } from "react";
import DocumentsUpload from "../DocumentsUpload.jsx";
import BatchUploadModal from "./BatchUploadModal.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [modalData, setModalData] = useState(null);

  const handleUploadComplete = (result) => {
    const docs = result?.documents || result?.processed;

    if (docs && Array.isArray(docs) && docs.length > 0) {
      toast.success("✅ Upload uspješno završen!");

      docs.forEach(doc => {
        if (doc.validation_alert) {
          toast.warn(`Upozorenje za dokument ${doc.original_filename}: ${doc.validation_alert}`);
        }
      });

      setModalData(docs[0]);
      setShowModal(false);
    } else {
      toast.error("❌ Došlo je do greške tijekom uploada!");
    }
  };

  const handleFilesSelected = (files) => {
    setFilesToUpload(files);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFilesToUpload([]);
  };

  return (
    <div className="upload-container">
      <header className="mb-4 text-center">
        <h1 className="page-title fw-bold">
          Odabir dokumenata za OCR obradu
        </h1>
        <p className="text-muted fst-italic">
          Pošalji nove dokumente za OCR obradu.
        </p>
      </header>

      <DocumentsUpload onFilesSelected={handleFilesSelected} />

      {showModal && (
        <BatchUploadModal
          files={filesToUpload}
          onClose={closeModal}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
