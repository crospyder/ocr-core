import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <nav className="sidebar bg-dark text-white p-3" style={{ width: '250px' }}>
      <ul className="list-unstyled">
        <li><Link to="/" className="text-white">Početna</Link></li>
        <li><Link to="/upload" className="text-white">Upload</Link></li>
        <li><Link to="/documents" className="text-white">Dokumenti</Link></li>
        <li><Link to="/admin" className="text-white">Admin Panel</Link></li>
        <li><Link to="/deployment" className="text-white">Deployment</Link></li> {/* ➕ NOVO */}
      </ul>
    </nav>
  );
}
