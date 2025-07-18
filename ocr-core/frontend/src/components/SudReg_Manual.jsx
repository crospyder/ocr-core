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
      return <p>Nema podataka</p>;
    }
    return (
      <ul>
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
    // Pretpostavljamo da je valuta EUR, pa formatiramo u euro format
    return `${iznos.toFixed(2)} €`;
  };

  return (
    <div className="container mt-4">
      <h2>Pretraživač Sudskog registra - ručna provjera</h2>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Unesite OIB (11 znakova)"
          value={oib}
          onChange={(e) => setOib(e.target.value)}
          maxLength={11}
        />
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "Tražim..." : "Traži"}
        </button>
      </div>

      {company && (
        <div className="card">
          <div className="card-body">
            <h5>{company.skracene_tvrtke?.[0]?.ime || company.tvrtke?.[0]?.ime || "Nema naziva"}</h5>
            <p><strong>OIB:</strong> {company.oib || "Nema podataka"}</p>
            <p><strong>Adresa:</strong> {formatAddress(company.sjedista)}</p>
            <p><strong>Temeljni kapital:</strong> {formatKapital(company.temeljni_kapitali)}</p>
            <p><strong>Status postupka:</strong> {company.postupci?.[0]?.vrsta?.znacenje || "Nema podataka"}</p>
            <p>
              <strong>Datum osnivanja:</strong>{" "}
              {company.datum_osnivanja
                ? new Date(company.datum_osnivanja).toLocaleDateString("hr-HR")
                : "Nema podataka"}
            </p>
            <p><strong>Email:</strong> {company.email_adrese?.[0]?.adresa || "Nema podataka"}</p>
            <div>
              <strong>Djelatnosti:</strong>
              {formatActivities(company.evidencijske_djelatnosti)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SudregManualSearch;
