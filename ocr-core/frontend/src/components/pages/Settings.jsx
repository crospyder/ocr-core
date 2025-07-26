import React, { useEffect, useState } from "react";
import axios from "axios";


export default function Settings() {
  const [settings, setSettings] = useState({
    dms_server_ip: "",
    dms_server_port: "",
    model_server_ip: "",
    model_server_port: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/settings")
      .then((res) => setSettings((prev) => ({ ...prev, ...res.data })))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setSettings((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    await axios.post("/api/settings", settings);
    alert("Spremljeno!");
  };

  if (loading) return <div className="text-center m-5">Učitavanje...</div>;

  return (
    <div className="card settings-page p-4" style={{ maxWidth: 520, margin: "40px auto" }}>
      <h2 className="mb-3">Postavke sustava</h2>
      <div className="mb-3">
        <label className="form-label">DMS Server IP</label>
        <input
          name="dms_server_ip"
          value={settings.dms_server_ip || ""}
          onChange={handleChange}
          className="form-control"
          autoComplete="off"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">DMS Server Port</label>
        <input
          name="dms_server_port"
          value={settings.dms_server_port || ""}
          onChange={handleChange}
          className="form-control"
          autoComplete="off"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Model Server IP</label>
        <input
          name="model_server_ip"
          value={settings.model_server_ip || ""}
          onChange={handleChange}
          className="form-control"
          autoComplete="off"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Model Server Port</label>
        <input
          name="model_server_port"
          value={settings.model_server_port || ""}
          onChange={handleChange}
          className="form-control"
          autoComplete="off"
        />
      </div>
      <button className="btn btn-primary w-100" onClick={handleSave}>
        Spremi postavke
      </button>
    </div>
  );
}
