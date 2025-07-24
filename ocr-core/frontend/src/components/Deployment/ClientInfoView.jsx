import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ClientInfoView() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    axios.get("/api/client/info")
      .then((res) => {
        if (res.data.needs_setup) {
          setEditMode(true);
        } else {
          const cl = res.data;
          setClient(cl);
          setFormData({
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
          });
        }
      })
      .catch(() => {
        toast.error("Greška pri dohvaćanju podataka o klijentu");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      setEditMode(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Greška kod spremanja podataka.");
    }
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
    <div className="card card-compact shadow p-4 mt-2">
      {editMode ? (
        <>
          <h4 className="fw-bold mb-3">Konfiguracija klijenta</h4>
          <form onSubmit={handleSubmit} className="row g-3">
            {[
              { label: "Naziv firme *", name: "naziv_firme", type: "text", required: true, col: "col-md-4" },
              { label: "OIB *", name: "oib", type: "text", required: true, col: "col-md-4" },
              { label: "DB Name *", name: "db_name", type: "text", required: true, col: "col-md-4" },
              { label: "Broj licenci", name: "broj_licenci", type: "number", min: 1, col: "col-md-6" },
              { label: "Adresa", name: "adresa", type: "text", col: "col-md-6" },
              { label: "Kontakt osoba", name: "kontakt_osoba", type: "text", col: "col-md-6" },
              { label: "Email", name: "email", type: "email", col: "col-md-6" },
              { label: "Telefon", name: "telefon", type: "text", col: "col-md-6" },
              { label: "Licenca početak", name: "licenca_pocetak", type: "date", col: "col-md-6" },
              { label: "Licenca kraj", name: "licenca_kraj", type: "date", col: "col-md-6" },
            ].map(({ label, name, type, required, min, col }) => (
              <div key={name} className={col}>
                <label className="form-label">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className="form-control"
                  required={required}
                  min={min}
                />
              </div>
            ))}

            <div className="col-md-6">
              <label className="form-label">Status licence</label>
              <select
                name="status_licence"
                value={formData.status_licence}
                onChange={handleChange}
                className="form-select"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary mt-3">
                Spremi podatke
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <h4 className="fw-bold mb-3">Podaci o licenciranom korisniku</h4>
          <p><strong>Naziv firme:</strong> {client.naziv_firme}</p>
          <p><strong>OIB:</strong> {client.oib}</p>
          <p><strong>DB Name:</strong> {client.db_name}</p>
          <p><strong>Broj licenci:</strong> {client.broj_licenci}</p>
          <p><strong>Adresa:</strong> {client.adresa || "-"}</p>
          <p><strong>Kontakt osoba:</strong> {client.kontakt_osoba || "-"}</p>
          <p><strong>Email:</strong> {client.email || "-"}</p>
          <p><strong>Telefon:</strong> {client.telefon || "-"}</p>
          <p><strong>Licenca početak:</strong> {client.licenca_pocetak || "-"}</p>
          <p><strong>Licenca kraj:</strong> {client.licenca_kraj || "-"}</p>
          <p><strong>Status licence:</strong> {client.status_licence}</p>
          <button className="btn btn-link mt-3" onClick={() => setEditMode(true)}>
            Uredi podatke
          </button>
        </>
      )}
    </div>
  );
}
