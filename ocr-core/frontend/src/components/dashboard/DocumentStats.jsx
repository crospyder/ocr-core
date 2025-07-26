import React, { useEffect, useState } from "react";

const statColors = {
  total_documents: "#28a745",
  processed_documents: "#007bff",
  total_pdf_size_gb: "#ffc107",
  ai_processed_documents: "#17a2b8",
  free_space_gb: "#17a2b8",
};

const statLabels = {
  total_documents: "Ukupno dokumenata",
  processed_documents: "Obrađeni (OCR)",
  ai_processed_documents: "Dokumenti obrađeni A.I.-jem",
  total_pdf_size_gb: "PDF ukupno (GB)",
  free_space_gb: "Slobodan prostor (GB)",
};

export default function DocumentStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/documents/stats-info");
        if (!res.ok) throw new Error("Greška pri dohvaćanju statistike.");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchStats();
  }, []);

  if (!stats) {
    return (
      <div className="card card-compact" style={{ minHeight: 300 }}>
        <div className="card-body text-muted">Učitavanje statistike...</div>
      </div>
    );
  }

  const toGB = (mb) => (mb / 1024).toFixed(2);

  const freeSpaceGB = toGB(stats.free_space_mb);
  const totalPDFGB = toGB(stats.total_pdf_size_mb);

  const statsToShow = [
    { key: "total_documents", value: stats.total_documents },
    { key: "processed_documents", value: stats.processed_documents },
    { key: "ai_processed_documents", value: stats.ai_processed_documents || 0 },
    { key: "total_pdf_size_gb", value: totalPDFGB },
    { key: "free_space_gb", value: freeSpaceGB },
  ];

  return (
    <div className="card card-compact p-3">
      <div
        className="stats-grid"
        style={{
          display: "flex",
          gap: "1.2rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {statsToShow.map(({ key, value }) => (
          <div
            key={key}
            className="stat-card"
            style={{
              background: statColors[key] + "33",
              borderRadius: 12,
              padding: "1.8rem 2rem",
              flex: "1 1 140px",
              minWidth: 140,
              textAlign: "center",
              boxShadow: "0 2px 8px rgb(36 56 93 / 0.12)",
            }}
          >
            <div
              className="stat-value fw-bold"
              style={{ fontSize: "2.6rem", color: statColors[key] }}
            >
              {value}
            </div>
            <div
              className="stat-label"
              style={{ fontWeight: 600, marginTop: 6, color: "#444" }}
            >
              {statLabels[key]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
