import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Upload,
  FileText,
  Settings,
  Server,
  Users,
} from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { to: "/", label: "Početna", icon: <Home size={18} />, end: true },
    { to: "/upload", label: "Upload", icon: <Upload size={18} /> },
    { to: "/documents", label: "Dokumenti", icon: <FileText size={18} /> },
    { to: "/partneri", label: "Partneri", icon: <Users size={18} />, end: true },
    { to: "/admin", label: "Admin Panel", icon: <Settings size={18} /> },
    { to: "/deployment", label: "Deployment", icon: <Server size={18} /> },
    { to: "/search", label: "Pretraga", icon: <FileText size={18} /> },
  ];

  return (
    <aside className="sidebar d-flex flex-column px-3 py-4">
      <div className="mb-4 text-center">
        <h4 className="fw-bold text-light">Izbornik</h4>
      </div>
      <nav className="nav flex-column gap-1">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded sidebar-link ${
                isActive ? "active-link" : "text-white"
              }`
            }
          >
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
