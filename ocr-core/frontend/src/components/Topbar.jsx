import React, { useState, useEffect } from "react";
import logo from "../../images/logo-main.png";
import { UserCircle } from "lucide-react";
import { Dropdown } from "react-bootstrap";

export default function Topbar() {
  const [username, setUsername] = useState("Korisnik");

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/";
  };

  return (
    <header
      className="navbar bg-white border-bottom shadow-sm px-4 d-flex justify-content-between align-items-center"
      style={{ height: "100px" }}
    >
      <div className="d-flex align-items-center">
        <img
          src={logo}
          alt="Spine ICT Logo"
          style={{ height: "45px", width: "auto" }}
          className="me-3"
        />
        <span className="h4 mb-0 text-primary fw-bold">Spine ICT DocuVision OCR systems</span>
      </div>

      <div className="d-flex align-items-center">
        <UserCircle size={28} className="me-2 text-secondary" />
        <Dropdown align="end">
          <Dropdown.Toggle
            variant="light"
            id="dropdown-basic"
            className="border-0 fw-semibold text-secondary shadow-none"
            style={{ minWidth: "120px" }}
          >
            {username}
          </Dropdown.Toggle>

          <Dropdown.Menu>
            <Dropdown.Item disabled>Profil (uskoro)</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout}>Odjava</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}
