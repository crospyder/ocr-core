import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ClientInfoView() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("clientFormData");
    return saved
      ? JSON.parse(saved)
      : {
          naziv_firme: "",
          oib: "",
          db_name: "",
          broj_licenci: 1,
          adresa: "",
          kontakt_osoba: "",
          email: "",
          telefon: "",
          licenca_pocetak: "",
          licenca_kraj: "",
          status_licence: "active",
        };
  });

  useEffect(() => {
    axios
      .get("/api/client/info")
      .then((res) => {
        if (res.data.needs_setup) {
          setEditMode(true);
        } else {
          const cl = res.data;
          setClient(cl);
          const parsed = {
            naziv_firme: cl.naziv_firme || "",
            oib: cl.oib || "",
            db_name: cl.db_name || "",
            broj_licenci: cl.broj_licenci || 1,
            adresa: cl.adresa || "",
            kontakt_osoba: cl.kontakt_osoba || "",
            email: cl.email || "",
            telefon: cl.telefon || "",
            licenca_pocetak: cl.licenca_pocetak ? cl.licenca_pocetak.substring(0, 10) : "",
            licenca_kraj: cl.licenca_kraj ? cl.licenca_kraj.substring(0, 10) : "",
            status_licence: cl.status_licence || "active",
          };
          setFormData(parsed);
          localStorage.setItem("clientFormData", JSON.stringify(parsed));
        }
      })
      .catch(() => {
        toast.error("Greška pri dohvaćanju podataka o klijentu");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("clientFormData", JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.naziv_firme || !formData.oib || !formData.db_name) {
      toast.warn("Molimo ispunite obavezna polja: Naziv, OIB i DB Name.");
      return;
    }
    try {
      if (client) {
        const res = await axios.put("/api/client/info", formData);
        setClient(res.data);
        toast.success("Podaci klijenta su ažurirani.");
      } else {
        const res = await axios.post("/api/client/info", formData);
        setClient(res.data);
        toast.success("Klijent uspješno kreiran.");
      }
      localStorage.setItem("clientFormData", JSON.stringify(formData));
      setEditMode(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Greška kod spremanja podataka.");
    }
  };

  const handleResetForm = () => {
    localStorage.removeItem("clientFormData");
    setFormData({
      naziv_firme: "",
      oib: "",
      db_name: "",
      broj_licenci: 1,
      adresa: "",
      kontakt_osoba: "",
      email: "",
      telefon: "",
      licenca_pocetak: "",
      licenca_kraj: "",
      status_licence: "active",
    });
  };

  if (loading) return <p>Učitavanje...</p>;

  if (!client && !editMode) {
    return (
      <div className="alert alert-warning" role="alert">
        Sustav nije konfiguriran. Molimo unesite podatke o klijentu.
      </div>
    );
  }

  return (
    <div className="client-info-card">
      {editMode ? (
        <>
          <h3 className="client-info-title">Konfiguracija klijenta</h3>
          <form onSubmit={handleSubmit} className="client-info-form">
            {[
              { label: "Naziv firme *", name: "naziv_firme", type: "text", required: true },
              { label: "OIB *", name: "oib", type: "text", required: true },
              { label: "DB Name *", name: "db_name", type: "text", required: true },
              { label: "Broj licenci", name: "broj_licenci", type: "number", min: 1 },
              { label: "Adresa", name: "adresa", type: "text" },
              { label: "Kontakt osoba", name: "kontakt_osoba", type: "text" },
              { label: "Email", name: "email", type: "email" },
              { label: "Telefon", name: "telefon", type: "text" },
              { label: "Licenca početak", name: "licenca_pocetak", type: "date" },
              { label: "Licenca kraj", name: "licenca_kraj", type: "date" },
            ].map(({ label, name, type, required, min }) => (
              <div key={name} className="client-info-field">
                <label htmlFor={name} className="client-info-label">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleChange}
                  className="client-info-input"
                  required={required}
                  min={min}
                  autoComplete="off"
                />
              </div>
            ))}

            <div className="client-info-field">
              <label htmlFor="status_licence" className="client-info-label">Status licence</label>
              <select
                id="status_licence"
                name="status_licence"
                value={formData.status_licence}
                onChange={handleChange}
                className="client-info-select"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="client-info-actions">
              <button type="submit" className="client-info-button">Spremi podatke</button>
              <button
                type="button"
                className="client-info-button client-info-button-secondary"
                onClick={() => setEditMode(false)}
              >
                Odustani
              </button>
              <button
                type="button"
                className="client-info-button client-info-button-secondary"
                onClick={handleResetForm}
              >
                Resetiraj formu
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h3 className="client-info-title">Podaci o licenciranom korisniku</h3>
          <div className="client-info-view">
            <div><strong>Naziv firme:</strong> {client.naziv_firme}</div>
            <div><strong>OIB:</strong> {client.oib}</div>
            <div><strong>DB Name:</strong> {client.db_name}</div>
            <div><strong>Broj licenci:</strong> {client.broj_licenci}</div>
            <div><strong>Adresa:</strong> {client.adresa || "-"}</div>
            <div><strong>Kontakt osoba:</strong> {client.kontakt_osoba || "-"}</div>
            <div><strong>Email:</strong> {client.email || "-"}</div>
            <div><strong>Telefon:</strong> {client.telefon || "-"}</div>
            <div><strong>Licenca početak:</strong> {client.licenca_pocetak || "-"}</div>
            <div><strong>Licenca kraj:</strong> {client.licenca_kraj || "-"}</div>
            <div><strong>Status licence:</strong> {client.status_licence}</div>
          </div>
          <button className="client-info-edit-button" onClick={() => setEditMode(true)}>
            Uredi podatke
          </button>
        </>
      )}
    </div>
  );
}
