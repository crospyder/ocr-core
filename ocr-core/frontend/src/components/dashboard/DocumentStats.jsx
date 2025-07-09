import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#007bff", "#28a745", "#ffc107", "#17a2b8"];

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
    <div className="document-stats-widget bg-white border rounded shadow-sm p-3 h-100">
      <h5 className="mb-3">📦 Statistika dokumenata i diska</h5>
      <ul className="list-unstyled small mb-4">
        <li><strong>Ukupno dokumenata:</strong> {stats.total_documents}</li>
        <li><strong>Obrađeni (OCR):</strong> {stats.processed_documents}</li>
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
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default DocumentStats;
