// #LoadingModal.jsx
import React from "react";

export default function LoadingModal({ visible, message = "Učitavanje i OCR obrada u tijeku..." }) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop d-flex align-center justify-center" tabIndex="-1" role="dialog">
      <div className="modal-card" role="document">
        <div className="modal-body text-center p-2">
          <div className="d-flex justify-center mb-3">
            <Spinner />
          </div>
          <p className="fw-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Spinner component po main.css stilu
function Spinner() {
  return (
    <span
      className="loading-spinner"
      style={{
        display: "inline-block",
        width: "3rem",
        height: "3rem",
        border: "4px solid #eaf1fb",
        borderTop: "4px solid #1a82e2",
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
      }}
      aria-label="Loading"
    />
  );
}

// Spinner animacija (dodaj u main.css ako već nemaš!)
/*
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
*/
