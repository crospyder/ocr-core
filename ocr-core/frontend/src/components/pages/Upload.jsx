import React, { useState } from "react";
import DocumentsUpload from "../DocumentsUpload.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  const handleUploadComplete = (result) => {
    console.log("Upload result:", result);

    const docs = result?.documents || result?.processed;

    if (docs && Array.isArray(docs) && docs.length > 0) {
      toast.success("✅ Upload uspješno završen!");

      // Provjeri ima li upozorenja
      docs.forEach(doc => {
        if (doc.validation_alert) {
          toast.warn(`Upozorenje za dokument ${doc.original_filename}: ${doc.validation_alert}`);
        }
      });

      // Postavi modal data i prikaži modal s podacima prvog dokumenta
      setModalData(docs[0]); // prikazujemo prvi dokument (možeš prilagoditi)
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
        <h1 className="display-5 fw-bold text-primary">
          Odabir dokumenata za OCR obradu
        </h1>
        <p className="text-secondary fst-italic">
          Pošalji nove dokumente za OCR obradu.
        </p>
      </header>

      <DocumentsUpload onUploadComplete={handleUploadComplete} />

      {showModal && modalData && (
        <div className="modal-backdrop" onClick={closeModal} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1050,
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: "white", padding: "20px", borderRadius: "8px",
            maxWidth: "600px", width: "90%", maxHeight: "80vh", overflowY: "auto",
          }}>
            <h4>Detalji dokumenta: {modalData.original_filename || modalData.filename}</h4>
            <hr />
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>
              {JSON.stringify(modalData.sudreg_data, null, 2) || "Nema podataka iz Sudreg API-ja."}
            </pre>
            <button className="btn btn-secondary mt-3" onClick={closeModal}>Zatvori</button>
          </div>
        </div>
      )}
    </div>
  );
}
