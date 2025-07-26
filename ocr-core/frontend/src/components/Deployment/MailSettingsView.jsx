import { useState, useEffect } from "react";
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
            password: "",
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
      const msg = error.response?.data?.detail || "Testiranje nije uspjelo";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
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
      const msg = error.response?.data?.detail || "Greška pri spremanju mail postavki.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mail-settings-card">
      <h3 className="mail-settings-title">Mail postavke - IMAP</h3>
      <form onSubmit={handleSubmit} className="mail-settings-form">
        {[
          { label: "Ime računa *", name: "name", type: "text", required: true },
          { label: "Provider (npr. Gmail, Office365)", name: "provider", type: "text" },
          { label: "Email adresa *", name: "email", type: "email", required: true },
          { label: "IMAP Server *", name: "imap_server", type: "text", required: true },
          { label: "IMAP Port *", name: "imap_port", type: "number", required: true, min: 1, max: 65535 },
          { label: "Korisničko ime *", name: "username", type: "text", required: true },
          { label: "Lozinka *", name: "password", type: "password", required: true },
        ].map(({ label, name, type, required, min, max }) => (
          <div key={name} className="mail-settings-field">
            <label htmlFor={name} className="mail-settings-label">{label}</label>
            <input
              id={name}
              name={name}
              type={type}
              value={formData[name]}
              onChange={handleChange}
              className="mail-settings-input"
              required={required}
              min={min}
              max={max}
              disabled={loading || testing}
              autoComplete={name === "password" ? "new-password" : undefined}
            />
          </div>
        ))}

        <div className="mail-settings-checkbox-group">
          <label className="mail-settings-checkbox-label">
            <input
              type="checkbox"
              name="use_ssl"
              checked={formData.use_ssl}
              onChange={handleChange}
              disabled={loading || testing}
            />
            Koristi SSL/TLS
          </label>
          <label className="mail-settings-checkbox-label">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              disabled={loading || testing}
            />
            Aktivno
          </label>
        </div>

        <div className="mail-settings-actions">
          <button
            type="button"
            className="btn btn-outline"
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
          <div className={`alert ${testResult.success ? "alert-success" : "alert-danger"}`}>
            {testResult.message}
          </div>
        )}

        {saved && (
          <div className="alert alert-info">
            Mail postavke su spremljene i spremne za korištenje.
          </div>
        )}
      </form>
    </div>
  );
}
