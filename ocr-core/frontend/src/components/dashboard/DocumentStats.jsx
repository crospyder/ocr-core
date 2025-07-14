import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#28a745", "#007bff", "#ffc107", "#17a2b8"]; // zelena, plava, zlatna, tirkizna

const DocumentStats = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/documents/stats-info");
        if (!res.ok) throw new Error("Greška pri dohvatu statistike.");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchStats();
  }, []);

  if (!stats) return <div className="text-muted">Učitavanje statistike...</div>;

  const pieData = Object.entries(stats.by_type || {}).map(([type, count]) => ({
    name: type,
    value: count,
  }));

  return (
    <div className="document-stats-widget bg-white border rounded shadow-sm p-4 h-100">
      <h5 className="mb-4 fw-bold text-dark">📦 Statistika dokumenata i diska</h5>
      
      <div className="d-flex justify-content-around mb-4 stats-summary">
        <div className="text-center">
          <div className="display-5 fw-bold text-success">{stats.total_documents}</div>
          <div className="text-muted small mt-1">Ukupno dokumenata</div>
        </div>
        <div className="text-center">
          <div className="display-5 fw-bold text-primary">{stats.processed_documents}</div>
          <div className="text-muted small mt-1">Obrađeni (OCR)</div>
        </div>
      </div>

      <ul className="list-unstyled small mb-4 text-secondary document-stats-list">
        <li><strong>PDF ukupno:</strong> {stats.total_pdf_size_mb} MB</li>
        <li><strong>Slobodan prostor:</strong> {stats.free_space_mb} MB</li>
      </ul>

      {pieData.length > 0 && (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              fill="#8884d8"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#f8f9fa", borderRadius: "8px", borderColor: "#dee2e6" }}
              itemStyle={{ color: "#232d39", fontWeight: "600" }}
            />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ marginTop: 10, fontWeight: "600", color: "#232d39" }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DocumentStats;
