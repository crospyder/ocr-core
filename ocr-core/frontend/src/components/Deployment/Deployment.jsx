import React, { useState } from "react";
import ClientInfoView from "../Deployment/ClientInfoView";
import MailSettingsView from "../Deployment/MailSettingsView";

export default function Deployment() {
  const [activeTab, setActiveTab] = useState("client");

  return (
    <div>
      <h2 className="mb-4">Deployment konfiguracija</h2>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "client" ? "active" : ""}`}
            onClick={() => setActiveTab("client")}
          >
            Podaci o korisniku
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "mail" ? "active" : ""}`}
            onClick={() => setActiveTab("mail")}
          >
            Mail postavke
          </button>
        </li>
      </ul>

      {activeTab === "client" && <ClientInfoView />}
      {activeTab === "mail" && <MailSettingsView />}
    </div>
  );
}
