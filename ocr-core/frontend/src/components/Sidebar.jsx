import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Upload,
  FileText,
  Settings,
  Server,
  Users,
  CheckSquare,
  Search,
  Mail,            // import ikone za mail (ako koristiš lucide-react)
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
    { to: "/tools/manual-sudreg", label: "Sudreg ručno", icon: <Search size={18} /> },
    { to: "/validation", label: "Validacija i klasifikacija", icon: <CheckSquare size={18} /> },
    { to: "/mail_clients", label: "Mail klijenti", icon: <Mail size={18} /> },  // Nova stavka
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-title mb-4 text-center">
        Izbornik
      </div>
      <nav className="d-flex flex-column gap-1">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active-link" : "")
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
