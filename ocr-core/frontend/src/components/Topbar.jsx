// src/components/Topbar.jsx

import React from "react";
import logo from "../../images/logo-spineict.png";

export default function Topbar() {
  return (
    <header 
      className="navbar navbar-light bg-light border-bottom shadow-sm px-3 d-flex justify-content-between align-items-center" 
      style={{ height: "250px" }}
    >
      <div className="d-flex align-items-center">
        <img src={logo} alt="Spine ICT Logo" style={{ height: "120px", width: "auto" }} />
        <h1 className="ms-4 mb-0 display-4 text-primary">OCR Sustav</h1>
      </div>
      <div className="text-secondary fs-4">Dobrodošli, korisniče</div>
    </header>
  );
}
