import React, { useState } from "react";
import DocumentsUpload from "../DocumentsUpload.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
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
      setShowModal(true);

      const uploadedIds = result.uploadedIds || docs.map(d => d.id);
      navigate("/documents", { state: { justUploaded: true, uploadedIds } });
    } else {
      toast.error("❌ Došlo je do greške tijekom uploada!");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData(null);
  };

  return (
    <div className="container py-5">
      <header className="mb-4 text-center">
        <h1 className="fw-bold page-title text-primary">
          Odabir dokumenata za OCR obradu
        </h1>
        <p className="text-muted fst-italic">
          Pošalji nove dokumente za OCR obradu.
        </p>
      </header>

      <DocumentsUpload onUploadComplete={handleUploadComplete} />

      {showModal && modalData && (
        <>
          <div className="pantheon-modal-backdrop"></div>
          <div className="pantheon-modal d-flex align-items-center justify-content-center">
            <div className="pantheon-modal-card">
              <div className="pantheon-modal-header d-flex justify-content-between align-items-center">
                <div>
                  <span className="pantheon-modal-icon">&#128196;</span>
                  <span className="pantheon-modal-title">
                    {modalData.original_filename || modalData.filename}
                  </span>
                </div>
                <button
                  className="pantheon-modal-close"
                  onClick={closeModal}
                  title="Zatvori"
                  aria-label="Zatvori"
                >&times;</button>
              </div>
              <div className="pantheon-modal-divider"></div>
              <div className="pantheon-modal-body">
                <pre className="pantheon-modal-pre">
                  {modalData.sudreg_data
                    ? JSON.stringify(modalData.sudreg_data, null, 2)
                    : "Nema podataka iz Sudreg API-ja."}
                </pre>
              </div>
              <div className="pantheon-modal-footer d-flex justify-content-end">
                <button className="btn btn-warning px-4" onClick={closeModal}>
                  Zatvori
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
