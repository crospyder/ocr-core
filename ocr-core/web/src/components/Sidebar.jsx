import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Poèetna" },
  { to: "/upload", label: "Upload" },
  { to: "/documents", label: "Dokumenti" },
  { to: "/partneri", label: "Partneri" },
  { to: "/admin", label: "Admin Panel" },
  { to: "/deployment", label: "Deployment" },
  { to: "/search", label: "Pretraga" },
];

export default function Sidebar() {
  return (
    <aside className="bg-dark text-white p-3" style={{ width: 220 }}>
      <h5 className="mb-4">Izbornik</h5>
      <nav className="nav flex-column gap-2">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link text-white ${isActive ? "fw-bold text-warning" : ""}`
            }
            end={to === "/"}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
