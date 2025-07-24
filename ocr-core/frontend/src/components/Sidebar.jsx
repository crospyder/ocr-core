import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Upload,
  FileText,
  Users,
  CheckSquare,
  Search,
  Mail,
  Archive,
  FilePlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function Sidebar() {
  const [euredOpen, setEuredOpen] = useState(false);

  const navItems = [
    { to: "/", label: "Početna", icon: <Home size={18} />, end: true },
    { to: "/upload", label: "Upload", icon: <Upload size={18} /> },
    { to: "/documents", label: "Dokumenti", icon: <FileText size={18} /> },
    { to: "/partneri", label: "Partneri", icon: <Users size={18} />, end: true },
    { to: "/search", label: "Pretraga", icon: <FileText size={18} /> },
    { to: "/tools/manual-sudreg", label: "Sudreg ručno", icon: <Search size={18} /> },
    { to: "/validation", label: "Validacija i klasifikacija", icon: <CheckSquare size={18} /> },
    { to: "/mail_clients", label: "Mail klijenti", icon: <Mail size={18} /> },
  ];

  const euredSubItems = [
    { to: "/billing/products", label: "Proizvodi" },
    { to: "/billing/services", label: "Usluge" },
    { to: "/billing/invoices", label: "Fakture" },
    { to: "/billing/config", label: "Konfiguracija" },
    { to: "/billing/invoice-create", label: "Nova Faktura" },
    { to: "/billing/offer-create", label: "Nova Ponuda" },
    { to: "/billing/delivery-note-create", label: "Nova Račun-otpremnica" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-title mb-4 text-center">Izbornik</div>
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

        <div className="sidebar-group mt-3">
          <div
            className="sidebar-group-title d-flex align-items-center gap-2 mb-2 cursor-pointer"
            onClick={() => setEuredOpen((o) => !o)}
          >
            <Archive size={18} />
            <span>E-ured</span>
            <span style={{ marginLeft: "auto" }}>
              {euredOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
          {euredOpen && (
            <nav className="d-flex flex-column ms-3">
              {euredSubItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    "sidebar-link" + (isActive ? " active-link" : "")
                  }
                >
                  <span className="sidebar-label">{label}</span>
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </nav>
    </aside>
  );
}
