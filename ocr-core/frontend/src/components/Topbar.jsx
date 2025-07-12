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
 import logoSymbol from "../../images/spineict-mikro-logo.png"; // Putanja do mikro loga

const navItems = [
  { to: "/", label: "Početna", icon: <Home size={12} />, end: true },
  { to: "/upload", label: "Upload", icon: <Upload size={12} /> },
  { to: "/documents", label: "Dokumenti", icon: <FileText size={12} /> },
  { to: "/partneri", label: "Partneri", icon: <Users size={12} />, end: true },
  { to: "/admin", label: "Admin Panel", icon: <Settings size={12} /> },
  { to: "/deployment", label: "Deployment", icon: <Server size={12} /> },
  { to: "/search", label: "Pretraga", icon: <FileText size={12} /> },
];

export default function Topbar() {
  return (
    <>
      <header className="topbar-minimal">
        <img src={logoSymbol} alt="Logo" className="topbar-minimal-logo" />
        <span className="topbar-minimal-txt">Spine ICT</span>
        <span className="topbar-minimal-desc">|| Document Management Systems</span>
      </header>
      
    </>
  );
}
