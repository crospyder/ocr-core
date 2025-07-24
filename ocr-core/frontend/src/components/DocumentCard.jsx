// #documentcard.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function DocumentCard({ title, partner, date, amount, ocrSnippet, viewMode, id }) {
  return (
    <div className={`card ${viewMode === "grid" ? "" : "mb-2"}`}>
      <div className="card-body">
        <h5 className="card-header p-0 mb-1 fw-bold">
          <Link to={`/documents/${id}`} className="doc-link">
            {title}
          </Link>
        </h5>
        <div className="text-muted mb-1 fw-medium">{partner}</div>
        <div className="card-text text-muted" style={{ fontSize: "0.99rem" }}>
          <span className="me-2">{date}</span>
          <span className="me-2">{amount}</span>
          <span>{ocrSnippet}</span>
        </div>
      </div>
    </div>
  );
}
