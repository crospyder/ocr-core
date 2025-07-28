// AdminBar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Settings, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

export default function AdminBar() {
  const [loading, setLoading] = useState(false);
  const [reparsing, setReparsing] = useState(false);

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

  const handleReparseAll = async () => {
    if (
      !window.confirm(
        "Ponovno ćeš parsirati i klasificirati SVE dokumente iz baze. Nastaviti?"
      )
    )
      return;
    setReparsing(true);
    console.log("handleReparseAll: prije axios poziva");

    try {
      const res = await axios.post("/api/documents/reparse-all");
      console.log("handleReparseAll: axios POST završio", res);
      toast.success(
        `Re-parsing gotovo: ${
          res.data.updated || res.data.message || "Status nepoznat"
        }.`
      );
      if (res.data.errors && res.data.errors.length > 0) {
        toast.warn(
          `Grešaka kod ${res.data.errors.length} dokumenata, vidi konzolu za detalje.`
        );
        console.warn("Greške pri re-parsiranju:", res.data.errors);
      }
    } catch (error) {
      console.error("handleReparseAll: axios greška", error);
      toast.error(
        "Greška prilikom re-parsinga: " +
          (error.response?.data?.detail || error.message)
      );
    } finally {
      setReparsing(false);
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
        <span className="sidebar-icon">
          <Settings size={18} />
        </span>
        <span className="sidebar-label">Admin Panel</span>
      </NavLink>
      <button
        onClick={handleClearAll}
        disabled={loading || reparsing}
        className="btn btn-danger btn-sm"
        title="Obriši sve podatke"
        style={{ minWidth: 110 }}
      >
        {loading ? "Brisanje..." : "Obriši sve"}
      </button>
      <button
        onClick={handleReparseAll}
        disabled={loading || reparsing}
        className="btn btn-warning btn-sm"
        title="Ponovno parsiraj i klasificiraj sve dokumente"
        style={{ minWidth: 170 }}
      >
        {reparsing ? (
          <>
            <RefreshCw className="spin" size={16} /> Parsiranje...
          </>
        ) : (
          "Re-parsiraj sve"
        )}
      </button>
    </div>
  );
}
