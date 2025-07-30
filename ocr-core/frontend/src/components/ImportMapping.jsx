import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const SUPPORTED_SOFTWARES = [
  "synesis",
  "4dwand",
  "phanteon",
  "remaris",
];

// Dodano "VAT_ID"!
const META_FIELDS = {
  "INVOICES": [
    "broj_racuna", "datum_racuna", "iznos", "kupac_naziv", "partner_oib"
  ],
  "PARTNERS": [
    "OIB", "VAT_ID", "naziv", "adresa", "mjesto", "kontakt"
  ],
  // Ostale meta tablice dodaj po potrebi
};

export default function ImportMapping() {
  const [selectedSoftware, setSelectedSoftware] = useState("");
  const [mappingData, setMappingData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Učitavanje mapiranja za odabrani software
  useEffect(() => {
    if (!selectedSoftware) {
      setMappingData({});
      return;
    }
    setLoading(true);
    axios.get(`/api/import/mapping/${selectedSoftware}`)
      .then(res => setMappingData(res.data || {}))
      .catch(() => {
        toast.error("Greška pri dohvaćanju mapiranja");
        setMappingData({});
      })
      .finally(() => setLoading(false));
  }, [selectedSoftware]);

  // Handler za promjenu mapping polja
  function handleFieldChange(table, field, value) {
    setMappingData(prev => ({
      ...prev,
      [table]: {
        ...prev[table],
        [field]: value,
      }
    }));
  }

  async function saveMapping() {
    if (!selectedSoftware) {
      toast.warn("Odaberi softver za spremanje mapiranja");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`/api/import/mapping/${selectedSoftware}`, mappingData);
      toast.success("Mapiranje uspješno spremljeno");
    } catch {
      toast.error("Greška pri spremanju mapiranja");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h3>Mapiranje softvera za uvoz podataka</h3>

      <div className="mb-3">
        <label>Odaberi softver:</label>
        <select
          className="form-select"
          value={selectedSoftware}
          onChange={e => setSelectedSoftware(e.target.value)}
        >
          <option value="">-- odaberi --</option>
          {SUPPORTED_SOFTWARES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {!selectedSoftware && <p>Odaberite softver za prikaz i uređivanje mapiranja.</p>}

      {loading && <p>Učitavam mapiranje...</p>}

      {!loading && selectedSoftware && (
        <div style={{ marginTop: 20 }}>
          {Object.entries(META_FIELDS).map(([table, fields]) => (
            <div key={table} style={{ marginBottom: 24 }}>
              <h5>{table}</h5>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Polje u DMS-u</th>
                    <th>Polje u uvoznom softveru</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(field => (
                    <tr key={field}>
                      <td>{field}</td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={mappingData[table]?.[field] || ""}
                          onChange={e => handleFieldChange(table, field, e.target.value)}
                          placeholder="Unesi polje iz uvoznog softvera"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <button
            className="btn btn-primary"
            onClick={saveMapping}
            disabled={saving}
          >
            {saving ? "Spremanje..." : "Spremi mapiranje"}
          </button>
        </div>
      )}
    </div>
  );
}
