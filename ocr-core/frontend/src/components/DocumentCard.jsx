import React from "react";
import { Link } from "react-router-dom";

export default function DocumentCard({ title, partner, date, amount, ocrSnippet, viewMode, id }) {
  return (
    <div className={`card ${viewMode === "grid" ? "" : "mb-2"}`}>
      <div className="card-body">
        <h5 className="card-title">
          <Link to={`/documents/${id}`}>{title}</Link>
        </h5>
        <h6 className="card-subtitle mb-2 text-muted">{partner}</h6>
        <p className="card-text">
          <small>{date}</small>
          <br />
          <small>{amount}</small>
          <br />
          <small>{ocrSnippet}</small>
        </p>
      </div>
    </div>
  );
}
