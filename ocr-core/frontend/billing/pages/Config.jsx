// Config.jsx
import React, { useState, useEffect } from "react";
import axios from "../axiosInstance";

export default function Config() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/billing/config/")
      .then(res => setConfig(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-4">Učitavanje konfiguracije...</div>;
  if (!config) return <div className="text-center mt-4">Nema konfiguracije</div>;

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-75">
      <div className="card config-card shadow-lg border-0">
        <div className="card-body">
          <h2 className="config-title text-center mb-4">
            Podaci o licenciranom korisniku
          </h2>
          <div className="row g-3 mb-2">
            <div className="col-md-6">
              <span className="config-label">Naziv firme:</span>
              <div className="config-value">{config.naziv_firme || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">OIB:</span>
              <div className="config-value">{config.oib || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">DB Name:</span>
              <div className="config-value">{config.db_name || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Broj licenci:</span>
              <div className="config-value">{config.broj_licenci || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Adresa:</span>
              <div className="config-value">{config.adresa || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Kontakt osoba:</span>
              <div className="config-value">{config.kontakt_osoba || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Email:</span>
              <div className="config-value">{config.email || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Telefon:</span>
              <div className="config-value">{config.telefon || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Licenca početak:</span>
              <div className="config-value">{config.licenca_pocetak || "-"}</div>
            </div>
            <div className="col-md-6">
              <span className="config-label">Licenca kraj:</span>
              <div className="config-value">{config.licenca_kraj || "-"}</div>
            </div>
            <div className="col-12">
              <span className="config-label">Status licence:</span>
              <div className="config-value">{config.status_licence || "-"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
