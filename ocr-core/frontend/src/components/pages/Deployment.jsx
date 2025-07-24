import React, { useState } from "react";
import ClientInfoView from "../Deployment/ClientInfoView";
import MailSettingsView from "../Deployment/MailSettingsView";

export default function Deployment() {
  const [activeTab, setActiveTab] = useState("client");

  return (
    <div className="container mt-2">
      <h2 className="fw-bold mb-3 page-title">Deployment konfiguracija</h2>

      <div className="d-flex gap-2 mb-3">
        <button
          className={`btn btn-secondary${activeTab === "client" ? " fw-bold" : ""}`}
          style={activeTab === "client" ? { background: "#eaf1fb", color: "#1a82e2" } : {}}
          onClick={() => setActiveTab("client")}
          type="button"
        >
          Podaci o korisniku
        </button>
        <button
          className={`btn btn-secondary${activeTab === "mail" ? " fw-bold" : ""}`}
          style={activeTab === "mail" ? { background: "#eaf1fb", color: "#1a82e2" } : {}}
          onClick={() => setActiveTab("mail")}
          type="button"
        >
          Mail postavke
        </button>
      </div>

      <div className="card card-compact shadow p-3">
        {activeTab === "client" && <ClientInfoView />}
        {activeTab === "mail" && <MailSettingsView />}
      </div>
    </div>
  );
}
