import React from "react";

export default function Sidebar() {
  return (
    <nav className="sidebar bg-dark text-white p-3" style={{ width: '250px' }}>
      <ul className="list-unstyled">
        <li><a href="/" className="text-white">Početna</a></li>
        <li><a href="/upload" className="text-white">Upload</a></li>
        <li><a href="/documents" className="text-white">Dokumenti</a></li>
        <li><a href="/admin" className="text-white">Admin Panel</a></li>
      </ul>
    </nav>
  );
}
