import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Settings, Server } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

export default function AdminBar() {
  const [loading, setLoading] = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/api/settings/training-mode")
      .then(res => setTrainingMode(res.data.enabled))
      .catch(() => setTrainingMode(false));
  }, []);

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

  const handleTrainingToggle = async (e) => {
    const enabled = e.target.checked;
    setSaving(true);
    try {
      await axios.patch("/api/settings/training-mode", { enabled });
      setTrainingMode(enabled);
      toast.success(`Trening A.I. modela je ${enabled ? "A.I. trening AKTIVAN" : "A.I. trening isključen"}.`);
    } catch (error) {
      toast.error("Greška prilikom promjene training moda.");
    } finally {
      setSaving(false);
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
      <NavLink
        to="/deployment"
        className={({ isActive }) =>
          "sidebar-link d-flex align-center" + (isActive ? " active-link" : "")
        }
        title="Deployment"
      >
        <span className="sidebar-icon"><Server size={18} /></span>
        <span className="sidebar-label">Deployment</span>
      </NavLink>
      {/* AI Training Mode Toggle */}
      <label className="d-flex align-center gap-1" style={{ marginBottom: 0, userSelect: "none" }}>
        <input
          type="checkbox"
          checked={trainingMode}
          onChange={handleTrainingToggle}
          disabled={saving}
          style={{ accentColor: "#0b5ed7" }}
        />
        <span style={{ fontWeight: 500, fontSize: 15 }}>
          Trening A.I. modela
        </span>
        <span
          style={{
            fontWeight: 600,
            color: trainingMode ? "#17c964" : "#d32f2f",
            marginLeft: 8,
            fontSize: 15,
            minWidth: 85,
            letterSpacing: 0.3,
            transition: "color 0.2s"
          }}
        >
          {trainingMode ? "AKTIVAN" : "Isključen"}
        </span>
      </label>
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
