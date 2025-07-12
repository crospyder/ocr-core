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
        // Update postojećeg klijenta PUT na /api/client/info
        const res = await axios.put("/api/client/info", formData);
        setClient(res.data);
        toast.success("Podaci klijenta su ažurirani.");
      } else {
        // Kreiraj novog klijenta POST na /api/client/info
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
    <div className="card mt-4 p-4">
      {editMode ? (
        <>
          <h4>Konfiguracija klijenta</h4>
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Naziv firme *</label>
              <input
                type="text"
                name="naziv_firme"
                value={formData.naziv_firme}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">OIB *</label>
              <input
                type="text"
                name="oib"
                value={formData.oib}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">DB Name *</label>
              <input
                type="text"
                name="db_name"
                value={formData.db_name}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Broj licenci</label>
              <input
                type="number"
                min="1"
                name="broj_licenci"
                value={formData.broj_licenci}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Adresa</label>
              <input
                type="text"
                name="adresa"
                value={formData.adresa}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Kontakt osoba</label>
              <input
                type="text"
                name="kontakt_osoba"
                value={formData.kontakt_osoba}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Telefon</label>
              <input
                type="text"
                name="telefon"
                value={formData.telefon}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Licenca početak</label>
              <input
                type="date"
                name="licenca_pocetak"
                value={formData.licenca_pocetak}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Licenca kraj</label>
              <input
                type="date"
                name="licenca_kraj"
                value={formData.licenca_kraj}
                onChange={handleChange}
                className="form-control"
              />
            </div>
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
          <h4>Podaci o licenciranom korisniku</h4>
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
