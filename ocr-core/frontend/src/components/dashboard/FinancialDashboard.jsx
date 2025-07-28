import React, { useState, useEffect } from "react";

export default function FinancialDashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partners, setPartners] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const BACKEND_URL = "http://10.0.1.252:8000";

  async function fetchPartners() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/partneri/`);
      if (!res.ok) throw new Error("Fetch partners failed");
      const json = await res.json();
      setPartners(json);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (partnerId) params.append("partner_id", partnerId);

      const res = await fetch(`${BACKEND_URL}/api/dashboard/finances/?${params.toString()}`);
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPartners();
    fetchData();
  }, []);

  return (
    <div className="container p-2">
      <h2 className="fw-bold mb-3">Prihodi i Rashodi</h2>
      <div className="d-flex gap-3 flex-wrap mb-4 align-center">
        <div className="filter-group">
          <label className="filter-label" htmlFor="start-date">Početni datum:</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="filter-group">
          <label className="filter-label" htmlFor="end-date">Krajnji datum:</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="form-control"
          />
        </div>
        <div className="filter-group" style={{ minWidth: "180px" }}>
          <label className="filter-label" htmlFor="partner-select">Partner:</label>
          <select
            id="partner-select"
            value={partnerId}
            onChange={e => setPartnerId(e.target.value)}
            className="form-select"
          >
            <option value="">-- Odaberi partnera --</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.naziv}</option>
            ))}
          </select>
        </div>
        <div className="filter-group" style={{ alignSelf: "flex-end" }}>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-primary"
          >
            Filtriraj
          </button>
        </div>
      </div>

      {loading && <p>Učitavanje...</p>}

      {data && (
        <table className="table" style={{ maxWidth: 400 }}>
          <thead>
            <tr>
              <th>Prihodi</th>
              <th>Rashodi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.total_income.toFixed(2)}</td>
              <td>{data.total_expense.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
