import React from "react";
import { NavLink } from "react-router-dom";
import logoSymbol from "../../images/spineict-mikro-logo.png"; // prilagodi putanju po potrebi

export default function Topbar() {
  return (
    <header className="topbar">
      <img src={logoSymbol} alt="Logo" className="topbar-logo" />
      <span className="topbar-title">Spine ICT</span>
      <span className="topbar-desc">|| Document Management Systems</span>
      {/* Ako želiš horizontalni meni odmah u topbaru, odkomentiraj blok ispod */}
      {/* 
      <nav className="menu-horizontal ms-4">
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              "menu-link" + (isActive ? " active" : "")
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      */}
    </header>
  );
}
