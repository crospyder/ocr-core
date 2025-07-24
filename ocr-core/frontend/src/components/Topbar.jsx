// #topbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import logoSymbol from "../../images/spineict-mikro-logo.png"; // prilagodi putanju po potrebi

export default function Topbar({ breadcrumbs = [] }) {
  return (
    <header className="topbar d-flex align-center justify-between">
      <div className="d-flex align-center gap-3">
        <img src={logoSymbol} alt="Logo" className="topbar-logo" />
        <span className="topbar-title">DMS</span>
        <span className="topbar-desc">|| Document Management System</span>
      </div>

      <nav
  aria-label="breadcrumb"
  className="breadcrumb-nav-wrapper"
  style={{ width: "100%" }}
>
  <div
    className="breadcrumbs-row d-flex align-center flex-wrap justify-end"
    style={{ width: "100%" }}
  >
    {breadcrumbs.map((bc, idx) => (
      <span key={bc.to} className="d-flex align-center">
        {idx !== 0 && <span className="breadcrumb-separator">/</span>}
        {idx === breadcrumbs.length - 1 ? (
          <span className="breadcrumb-item active">{bc.name}</span>
        ) : (
          <Link to={bc.to} className="breadcrumb-item">
            {bc.name}
          </Link>
        )}
      </span>
    ))}
  </div>
</nav>
    </header>
  );
}
