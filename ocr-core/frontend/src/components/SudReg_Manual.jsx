// #SudReg_Manual.jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

function SudregManualSearch() {
  const [oib, setOib] = useState("");
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (oib.length !== 11) {
      toast.error("OIB mora imati točno 11 znakova.");
      return;
    }

    setLoading(true);
    setCompany(null);

    try {
      const response = await axios.get("/api/tools/sudreg-manual-raw", {
        params: { oib },
      });
      setCompany(response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        toast.error("Subjekt nije pronađen.");
      } else {
        toast.error("Došlo je do pogreške pri dohvaćanju podataka.");
      }
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Pomagalo za prikaz adrese
  const formatAddress = (sjedista) => {
    if (!sjedista || !Array.isArray(sjedista) || sjedista.length === 0) {
      return "Nema podataka";
    }
    const sj = sjedista[0];
    return `${sj.ulica || ""} ${sj.kucni_broj || ""}, ${sj.naziv_naselja || ""}`.trim();
  };

  // Pomagalo za prikaz djelatnosti (lista)
  const formatActivities = (activities) => {
    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      return <span className="text-muted">Nema podataka</span>;
    }
    return (
      <ul className="mb-2 ms-2" style={{ fontSize: "0.97em" }}>
        {activities.map((act, index) => (
          <li key={index}>{act.djelatnost_tekst}</li>
        ))}
      </ul>
    );
  };

  // Pomagalo za prikaz temeljnog kapitala u eurima sa dvije decimale i simbolom €
  const formatKapital = (kapitalArray) => {
    if (!kapitalArray || !Array.isArray(kapitalArray) || kapitalArray.length === 0) {
      return "Nema podataka";
    }
    const kapital = kapitalArray[0];
    const iznos = kapital.iznos || 0;
    return `${iznos.toFixed(2)} €`;
  };

  return (
    <div className="container mt-2 mb-2" style={{ maxWidth: 620 }}>
      <div className="card card-compact shadow p-3 mb-3">
        <h2 className="fw-bold mb-3 page-title">Pretraživač Sudskog registra (ručna provjera)</h2>
        <div className="d-flex gap-1 mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Unesite OIB (11 znakova)"
            value={oib}
            onChange={(e) => setOib(e.target.value.replace(/\D/g, ""))}
            maxLength={11}
            style={{ maxWidth: 200 }}
            onKeyDown={handleKeyDown}
          />
          <button
            className="btn btn-primary fw-bold"
            onClick={handleSearch}
            disabled={loading}
            style={{ minWidth: 120 }}
          >
            {loading ? "Tražim..." : "Traži"}
          </button>
        </div>

        {company && (
          <div className="card card-compact p-3 mt-2 mb-2">
            <h5 className="fw-bold mb-2">
              {company.skracene_tvrtke?.[0]?.ime || company.tvrtke?.[0]?.ime || "Nema naziva"}
            </h5>
            <div className="mb-1"><strong>OIB:</strong> {company.oib || "Nema podataka"}</div>
            <div className="mb-1"><strong>Adresa:</strong> {formatAddress(company.sjedista)}</div>
            <div className="mb-1"><strong>Temeljni kapital:</strong> {formatKapital(company.temeljni_kapitali)}</div>
            <div className="mb-1"><strong>Status postupka:</strong> {company.postupci?.[0]?.vrsta?.znacenje || "Nema podataka"}</div>
            <div className="mb-1">
              <strong>Datum osnivanja:</strong>{" "}
              {company.datum_osnivanja
                ? new Date(company.datum_osnivanja).toLocaleDateString("hr-HR")
                : "Nema podataka"}
            </div>
            <div className="mb-1"><strong>Email:</strong> {company.email_adrese?.[0]?.adresa || "Nema podataka"}</div>
            <div className="mb-1">
              <strong>Djelatnosti:</strong>
              {formatActivities(company.evidencijske_djelatnosti)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SudregManualSearch;
