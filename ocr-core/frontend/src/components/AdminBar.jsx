// AdminBar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Settings } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

export default function AdminBar() {
  const [loading, setLoading] = useState(false);

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Jeste li sigurni da želite obrisati SVE dokumente, partnere i indeks? Ova akcija je nepovratna!"
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await axios.delete("/api/documents/clear-all");
      toast.success(
        "Svi dokumenti, partneri i Elasticsearch indeks su uspješno obrisani."
      );
    } catch (error) {
      toast.error(
        "Greška prilikom brisanja: " +
        (error.response?.data?.detail || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adminbar d-flex align-center gap-2">
      <NavLink
        to="/admin"
        className={({ isActive }) =>
          "sidebar-link d-flex align-center" + (isActive ? " active-link" : "")
        }
        title="Admin Panel"
      >
        <span className="sidebar-icon"><Settings size={18} /></span>
        <span className="sidebar-label">Admin Panel</span>
      </NavLink>
      <button
        onClick={handleClearAll}
        disabled={loading}
        className="btn btn-danger btn-sm"
        title="Obriši sve podatke"
        style={{ minWidth: 110 }}
      >
        {loading ? "Brisanje..." : "Obriši sve"}
      </button>
    </div>
  );
}
