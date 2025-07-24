// services.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function Services() {
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openOpisIndex, setOpenOpisIndex] = useState(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/billing/services/");
      setServices(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleChange = (e) => {
    setEditing({ ...editing, [e.target.name]: e.target.value });
  };

  const handleEdit = (service) => setEditing(service);

  const handleNew = () =>
    setEditing({
      sifra: "",
      naziv: "",
      opis: "",
      cijena: 0,
      pdv_postotak: 25,
      jedinica_mjere: "kom",
      aktivan: true,
    });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing.id) {
        await axios.put(`/billing/services/${editing.id}`, editing);
      } else {
        await axios.post("/billing/services/", editing);
      }
      setEditing(null);
      fetchServices();
    } catch {
      alert("Greška pri spremanju");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Obrisati uslugu?")) return;
    await axios.delete(`/billing/services/${id}`);
    fetchServices();
  };

  if (loading) return <div>Učitavanje usluga...</div>;

  return (
    <div className="container">
      <h2>Usluge</h2>
      {!editing && (
        <button className="btn btn-success mb-2" onClick={handleNew}>
          Nova usluga
        </button>
      )}

      {editing && (
        <>
          <div className="fw-bold mb-2" style={{ fontSize: "1.08rem" }}>
            Dodavanje nove usluge
          </div>
          <form onSubmit={handleSave} className="service-form-horizontal mb-2">
            <div className="service-form-fields">
              <div className="service-form-group">
                <label>Šifra</label>
                <input
                  name="sifra"
                  className="form-control"
                  value={editing.sifra}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="service-form-group">
                <label>Naziv</label>
                <input
                  name="naziv"
                  className="form-control"
                  value={editing.naziv}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="service-form-group">
                <label>Opis</label>
                <input
                  name="opis"
                  className="form-control"
                  value={editing.opis || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="service-form-group">
                <label>Cijena</label>
                <input
                  name="cijena"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={editing.cijena}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="service-form-group">
                <label>PDV (%)</label>
                <input
                  name="pdv_postotak"
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={editing.pdv_postotak}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="service-form-group">
                <label>J.mj</label>
                <input
                  name="jedinica_mjere"
                  className="form-control"
                  value={editing.jedinica_mjere}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="service-form-group d-flex align-center" style={{ marginTop: 24 }}>
                <label>Aktivan</label>
                <input
                  name="aktivan"
                  type="checkbox"
                  checked={editing.aktivan}
                  onChange={(e) => setEditing({ ...editing, aktivan: e.target.checked })}
                  style={{ marginLeft: 6 }}
                />
              </div>
            </div>
            <div className="service-form-actions">
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? "Spremam..." : "Spremi"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(null)}
              >
                Odustani
              </button>
            </div>
          </form>
        </>
      )}

      <table className="invoice-table-excel w-100">
        <thead>
          <tr>
            <th>Šifra</th>
            <th>Naziv</th>
            <th>Cijena</th>
            <th>PDV (%)</th>
            <th>Jedinica mjere</th>
            <th>Aktivan</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <React.Fragment key={s.id}>
              <tr>
                <td>{s.sifra}</td>
                <td>{s.naziv}</td>
                <td>{s.cijena.toFixed(2)}</td>
                <td>{s.pdv_postotak}</td>
                <td>{s.jedinica_mjere}</td>
                <td>{s.aktivan ? "Da" : "Ne"}</td>
                <td className="table-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(s)}>
                    Uredi
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>
                    Obriši
                  </button>
                </td>
              </tr>
              <tr className="opis-collapse-row">
                <td colSpan={7}>
                  <div className="opis-collapse-container">
                    <span
                      className={
                        "opis-collapse-indicator " +
                        (s.opis && s.opis.trim() !== "" ? "green" : "red")
                      }
                      title={s.opis && s.opis.trim() !== "" ? "Opis postoji" : "Opis prazan"}
                    />
                    <button
                      className="opis-collapse-toggle"
                      type="button"
                      onClick={() => setOpenOpisIndex(openOpisIndex === i ? null : i)}
                      tabIndex={0}
                      aria-label="Prikaži/sakrij opis"
                    >
                      Opis
                      <span className={"opis-collapse-arrow" + (openOpisIndex === i ? " open" : "")}>
                        ▶
                      </span>
                    </button>
                    <div
                      style={{
                        maxHeight: openOpisIndex === i ? 400 : 0,
                        transition: "max-height 0.35s cubic-bezier(.42,1.05,.69,1.11)",
                        overflow: "hidden",
                        flex: 1,
                        display: openOpisIndex === i ? "block" : "none",
                        marginLeft: 8,
                      }}
                    >
                      <textarea
                        className="opis-collapse-field"
                        placeholder="Opis usluge (opcionalno)"
                        value={s.opis || ""}
                        readOnly
                        rows={openOpisIndex === i ? 4 : 1}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
