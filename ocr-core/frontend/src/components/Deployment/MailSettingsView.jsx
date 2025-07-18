import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function MailSettingsView() {
  const [formData, setFormData] = useState({
    name: "",
    provider: "",
    email: "",
    imap_server: "",
    imap_port: 993,
    use_ssl: true,
    username: "",
    password: "",
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios.get("/api/mail_accounts/")
      .then(res => {
        if (res.data && res.data.length > 0) {
          const mail = res.data[0];
          setFormData({
            name: mail.name || "",
            provider: mail.provider || "",
            email: mail.email || "",
            imap_server: mail.imap_server || "",
            imap_port: mail.imap_port || 993,
            use_ssl: mail.use_ssl !== undefined ? mail.use_ssl : true,
            username: mail.username || "",
            password: "", // Lozinka se ne vraća iz sigurnosnih razloga
            active: mail.active === undefined ? true : mail.active,
          });
        }
      })
      .catch(() => {
        toast.error("Greška pri učitavanju mail postavki.");
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setTestResult(null);
    setSaved(false);
  };

  const handleTestSettings = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post("/api/mail_accounts/test", formData);
      setTestResult({ success: true, message: response.data.message });
      toast.success(response.data.message);
    } catch (error) {
      setTestResult({ success: false, message: error.response?.data?.detail || "Testiranje nije uspjelo" });
      toast.error(error.response?.data?.detail || "Testiranje nije uspjelo");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/mail_accounts/", formData);
      toast.success("Mail postavke uspješno spremljene.");
      setSaved(true);
      setTestResult(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Greška pri spremanju mail postavki.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mt-4 p-4">
      <h4>Mail postavke - IMAP</h4>
      <form onSubmit={handleSubmit} className="row g-3">

        <div className="col-md-6">
          <label className="form-label">Ime računa *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-control"
            required
            disabled={loading || testing}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Provider (npr. Gmail, Office365)</label>
          <input
            type="text"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="form-control"
            disabled={loading || testing}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Email adresa *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-control"
            required
            disabled={loading || testing}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">IMAP Server *</label>
          <input
            type="text"
            name="imap_server"
            value={formData.imap_server}
            onChange={handleChange}
            className="form-control"
            required
            disabled={loading || testing}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">IMAP Port *</label>
          <input
            type="number"
            name="imap_port"
            value={formData.imap_port}
            onChange={handleChange}
            className="form-control"
            required
            min={1}
            max={65535}
            disabled={loading || testing}
          />
        </div>

        <div className="col-md-3 d-flex align-items-center mt-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="use_ssl"
              checked={formData.use_ssl}
              onChange={handleChange}
              id="use_ssl"
              disabled={loading || testing}
            />
            <label className="form-check-label" htmlFor="use_ssl">Koristi SSL/TLS</label>
          </div>
        </div>

        <div className="col-md-6">
          <label className="form-label">Korisničko ime *</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-control"
            required
            disabled={loading || testing}
          />
        </div>

        <div className="col-md-6">
          <label className="form-label">Lozinka *</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-control"
            required
            disabled={loading || testing}
            autoComplete="new-password"
          />
        </div>

        <div className="col-md-6 d-flex align-items-center mt-4">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              id="active"
              disabled={loading || testing}
            />
            <label className="form-check-label" htmlFor="active">Aktivno</label>
          </div>
        </div>

        <div className="col-12 d-flex justify-content-between mt-3">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleTestSettings}
            disabled={loading || testing}
          >
            {testing ? "Testiram..." : "Testiraj postavke"}
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || testing || !testResult?.success}
          >
            {loading ? "Spremam..." : "Spremi postavke"}
          </button>
        </div>

        {testResult && (
          <div className={`alert mt-3 ${testResult.success ? "alert-success" : "alert-danger"}`} role="alert">
            {testResult.message}
          </div>
        )}

        {saved && (
          <div className="alert alert-info mt-3" role="alert">
            Mail postavke su spremljene i spremne za korištenje.
          </div>
        )}
      </form>
    </div>
  );
}
