// ocr-core/frontend/src/components/dashboard/Dashboard.jsx
import React from "react";
import RecentDocuments from "./RecentDocuments";
import DocumentStats from "./DocumentStats";
import TopPartners from "./TopPartners";
import FinancialDashboard from "./FinancialDashboard";

export default function Dashboard() {
  return (
    <main className="container mt-2 mb-2 main-content">
      <header className="page-header mb-4">
        <h1 className="page-title">Statistika i analitika</h1>
      </header>

      <section className="dashboard-grid">
        <div className="dashboard-card">
          <h2 className="card-header">Posljednje obrađeno</h2>
          <div className="card-body">
            <RecentDocuments />
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-header">Stats</h2>
          <div className="card-body">
            <DocumentStats />
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-header">Top partneri po broju dokumenata</h2>
          <div className="card-body">
            <TopPartners />
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="card-header">Prihodi i rashodi</h2>
          <div className="card-body">
            <FinancialDashboard />
          </div>
        </div>
      </section>
    </main>
  );
}
