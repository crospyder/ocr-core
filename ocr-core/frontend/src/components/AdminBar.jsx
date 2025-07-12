import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function AdminBar() {
  const [loading, setLoading] = useState(false);

  const handleClearAll = async () => {
    console.log("Klik na gumb 'Obriši sve'");

    if (!window.confirm("Jeste li sigurni da želite obrisati SVE dokumente, partnere i indeks? Ova akcija je nepovratna!")) {
      console.log("Brisanje otkazano od strane korisnika.");
      return;
    }

    setLoading(true);
    console.log("Pokreće se brisanje svih podataka...");

    try {
      const response = await axios.delete("/api/documents/clear-all");
      console.log("API je vratio odgovor:", response.data);
      toast.success("Svi dokumenti, partneri i Elasticsearch indeks su uspješno obrisani.");
    } catch (error) {
      console.error("Greška tijekom brisanja:", error);
      toast.error("Greška prilikom brisanja: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
      console.log("Brisanje završeno.");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#222",
        color: "white",
        padding: "6px 12px",
        textAlign: "right",
        fontWeight: "bold",
        userSelect: "none",
        zIndex: 1200,
      }}
    >
      <button
        onClick={handleClearAll}
        disabled={loading}
        style={{
          backgroundColor: "#d32f2f",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "6px 12px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: "bold",
        }}
        title="Obriši sve podatke"
      >
        {loading ? "Brisanje..." : "Obriši sve"}
      </button>
    </div>
  );
}
