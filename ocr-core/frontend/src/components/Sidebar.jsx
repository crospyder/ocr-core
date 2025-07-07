import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Upload, FileText, Settings, Server } from "lucide-react";

export default function Sidebar() {
  return (
    <aside
      className="bg-dark text-white px-3 py-4 d-flex flex-column"
      style={{
        width: "250px",
        height: "calc(100vh - 100px)", // zauzima preostali prostor ispod topbara
        position: "sticky",
        top: "100px", // odmah ispod topbara
        overflowY: "auto",
      }}
    >
      <div className="mb-4 text-center">
        <h4 className="fw-bold text-light">📄 OCR Core</h4>
      </div>
      <nav className="nav flex-column gap-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive ? "active-link" : "text-white"
            }`
          }
        >
          <Home size={18} /> Početna
        </NavLink>
        <NavLink
          to="/upload"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive ? "active-link" : "text-white"
            }`
          }
        >
          <Upload size={18} /> Upload
        </NavLink>
        <NavLink
          to="/documents"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive ? "active-link" : "text-white"
            }`
          }
        >
          <FileText size={18} /> Dokumenti
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive ? "active-link" : "text-white"
            }`
          }
        >
          <Settings size={18} /> Admin Panel
        </NavLink>
        <NavLink
          to="/deployment"
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded ${
              isActive ? "active-link" : "text-white"
            }`
          }
        >
          <Server size={18} /> Deployment
        </NavLink>
      </nav>
    </aside>
  );
}
