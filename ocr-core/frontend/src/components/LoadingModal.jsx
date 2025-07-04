import React from "react";

export default function LoadingModal({ visible, message = "Učitavanje i OCR obrada u tijeku..." }) {
  if (!visible) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content text-center p-4">
          <div className="d-flex justify-content-center mb-3">
            <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
              <span className="visually-hidden">Učitavanje...</span>
            </div>
          </div>
          <p className="fw-semibold">{message}</p>
        </div>
      </div>
    </div>
  );
}
