import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import ClientInfoView from "./Deployment/ClientInfoView";
import MailSettingsView from "./Deployment/MailSettingsView";
import Settings from "./pages/Settings";  // Ispravljena putanja na "pages"

function TrainingModeSwitch({ value, onChange, loading }) {
  return (
    <div className="training-switch-wrap mb-2">
      <label className="training-switch-label" style={{ userSelect: "none" }}>
        <input
          type="checkbox"
          checked={!!value}
          disabled={loading}
          onChange={e => onChange(e.target.checked)}
          autoComplete="off"
        />
        <span className="training-switch-slider"></span>
        <span className="training-switch-text" style={{ marginLeft: 8 }}>
          {value ? "Trening MOD UKLJUČEN" : "Trening MOD ISKLJUČEN"}
        </span>
      </label>
    </div>
  );
}

function TrainingLogWidget({ wsUrl }) {
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!wsUrl) return;
    wsRef.current = new window.WebSocket(wsUrl);
    wsRef.current.onmessage = (e) => {
      setLogs((prev) => [...prev, e.data]);
    };
    return () => wsRef.current && wsRef.current.close();
  }, [wsUrl]);

  return (
    <div className="ai-log-box mt-3">
      <b>Trening log:</b>
      <div className="ai-log-entries" style={{ maxHeight: 200, overflowY: "auto" }}>
        {logs.length === 0
          ? <em>Nema logova...</em>
          : logs.map((log, i) => <div key={i} style={{ fontSize: 13 }}>{log}</div>)
        }
      </div>
    </div>
  );
}

function DatabaseInfoView() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDb() {
      setLoading(true);
      try {
        const res = await axios.get("/api/admin/database-info");
        setInfo(res.data);
      } catch {
        toast.error("Greška kod dohvaćanja informacija o bazi.");
      } finally {
        setLoading(false);
      }
    }
    fetchDb();
  }, []);

  if (loading) return <div className="p-2">Učitavanje...</div>;
  if (!info) return <div className="alert alert-warning">Nema podataka o bazi.</div>;

  return (
    <div className="card card-compact shadow p-2 mt-2" style={{ maxWidth: 620, margin: "0 auto" }}>
      <h4 className="fw-bold mb-3">Baza podataka</h4>
      <div className="mb-2"><b>Naziv baze:</b> {info.db_name}</div>
      <div className="mb-2"><b>Veličina baze:</b> {info.db_size}</div>
      <div className="mb-2"><b>Korisnika u bazi:</b> {info.user_count}</div>
      <div className="mb-2"><b>Tablice:</b></div>
      <ul style={{ paddingLeft: 16, marginTop: 0 }}>
        {info.tables?.map(tbl => <li key={tbl}>{tbl}</li>)}
      </ul>
    </div>
  );
}

function MlMetrics({ metrics }) {
  if (!metrics) return null;

  return (
    <div className="card card-compact mt-3 p-3" style={{ backgroundColor: "#222b45", color: "white", borderRadius: 8 }}>
      <h3>Analitički podaci o modelu</h3>
      <p><strong>Accuracy:</strong> {metrics.accuracy ?? "N/A"}</p>
      <p><strong>Loss:</strong> {metrics.loss ?? "N/A"}</p>
      <p><strong>Training time (s):</strong> {metrics.training_time_seconds ?? "N/A"}</p>
      <p><strong>Epochs:</strong> {metrics.epochs ?? "N/A"}</p>

      <h4>Precision po klasama:</h4>
      <ul>
        {Object.entries(metrics.precision ?? {}).map(([cls, val]) => (
          <li key={cls}>{cls}: {val}</li>
        ))}
      </ul>

      <h4>Recall po klasama:</h4>
      <ul>
        {Object.entries(metrics.recall ?? {}).map(([cls, val]) => (
          <li key={cls}>{cls}: {val}</li>
        ))}
      </ul>

      <h4>F1-score po klasama:</h4>
      <ul>
        {Object.entries(metrics.f1_score ?? {}).map(([cls, val]) => (
          <li key={cls}>{cls}: {val}</li>
        ))}
      </ul>
    </div>
  );
}

function RegexEditor() {
  const [regexContent, setRegexContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchRegex() {
      setLoading(true);
      try {
        const res = await axios.get("/api/regex-config");
        setRegexContent(JSON.stringify(res.data, null, 2));
      } catch {
        toast.error("Greška pri dohvaćanju regex konfiguracije.");
      } finally {
        setLoading(false);
      }
    }
    fetchRegex();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      let regexContentParsed;
      try {
        regexContentParsed = JSON.parse(regexContent);
      } catch {
        toast.error("Regex konfiguracija nije validan JSON!");
        setSaving(false);
        return;
      }
      await axios.post("http://10.0.1.6:9000/api/regex-config", { regex: JSON.stringify(regexContentParsed) });
      toast.success("Regex konfiguracija spremljena.");
    } catch {
      toast.error("Greška pri spremanju regex konfiguracije.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-3" style={{ maxWidth: 800, margin: "0 auto" }}>
      <h3>Regex Editor</h3>
      {loading ? (
        <div>Učitavanje...</div>
      ) : (
        <>
          <textarea
            style={{ width: "100%", height: 400, fontFamily: "monospace", fontSize: 14 }}
            value={regexContent}
            onChange={e => setRegexContent(e.target.value)}
          />
          <button
            className="btn btn-primary mt-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Spremanje..." : "Spremi regex"}
          </button>
        </>
      )}
    </div>
  );
}

const TABS = [
  { key: "ai", label: "AI Trening" },
  { key: "client", label: "Podaci o korisniku" },
  { key: "mail", label: "Mail postavke" },
  { key: "db", label: "Baza podataka" },
  { key: "regex", label: "Regex Editor" },
  { key: "settings", label: "Postavke poslužitelja" }, // dodat tab
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("ai");
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainMsg, setTrainMsg] = useState("");
  const [settings, setSettings] = useState({
    model_server_ip: "",
    model_server_port: ""
  });
  const [trainingMode, setTrainingMode] = useState(false);
  const [trainingModeLoading, setTrainingModeLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    axios.get("/api/settings/training-mode")
      .then(res => setTrainingMode(res.data.enabled))
      .catch(() => setTrainingMode(false));
  }, []);

  useEffect(() => {
    if (activeTab === "ai") {
      fetchMetrics();
    }
  }, [activeTab]);

  async function fetchMetrics() {
    try {
      const modelServerUrl = `http://${settings.model_server_ip || "10.0.1.6"}:${settings.model_server_port || "9000"}`;
      const res = await fetch(`${modelServerUrl}/api/ml/metrics`);
      if (!res.ok) throw new Error("Nema metrika");
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error("Fetch metrics error:", e);
      setMetrics(null);
    }
  }

  async function handleToggleTrainingMode(enabled) {
    setTrainingModeLoading(true);
    try {
      await axios.patch("/api/settings/training-mode", { enabled });
      setTrainingMode(enabled);
      toast.success(enabled ? "Trening mod uključen" : "Trening mod isključen");
    } catch {
      toast.error("Greška kod promjene trening moda");
    } finally {
      setTrainingModeLoading(false);
    }
  }

  async function handleTrainModel() {
    setTrainLoading(true);
    setTrainMsg("");
    try {
      const url = `http://${settings.model_server_ip || "10.0.1.6"}:${settings.model_server_port || "9000"}/api/train_model`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      setTrainMsg(data.message || "Treniranje pokrenuto!");
      await fetchMetrics();
    } catch (err) {
      setTrainMsg("Greška pri treniranju: " + err.message);
    } finally {
      setTrainLoading(false);
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case "ai":
        return (
          <div className="container">
            <div className="card card-compact mb-4 p-4" style={{ background: "#20294a", color: "#f5f5f7" }}>
              <TrainingModeSwitch
                value={trainingMode}
                onChange={handleToggleTrainingMode}
                loading={trainingModeLoading}
              />
              <button
                className="btn btn-primary"
                onClick={handleTrainModel}
                disabled={trainLoading}
                style={{ minWidth: 270, fontSize: 20, fontWeight: 600, margin: "18px 0 8px 0" }}
              >
                {trainLoading ? "Treniranje..." : "Pokreni treniranje AI modela"}
              </button>
              {trainMsg && (
                <div style={{ color: "#8cf", marginTop: 6, fontSize: 16, fontWeight: 500 }}>{trainMsg}</div>
              )}
              <TrainingLogWidget wsUrl={wsUrl} />
              <MlMetrics metrics={metrics} />
            </div>
          </div>
        );
      case "client":
        return <ClientInfoView />;
      case "mail":
        return <MailSettingsView />;
      case "db":
        return <DatabaseInfoView />;
      case "regex":
        return <RegexEditor />;
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  }

  const wsUrl = settings.model_server_ip && settings.model_server_port
    ? `ws://${settings.model_server_ip}:${settings.model_server_port}/ws/training-logs`
    : "ws://10.0.1.6:9000/ws/training-logs";

  return (
    <div className="container mt-2 mb-3" style={{ maxWidth: 1100 }}>
      <h2 className="mb-3">Admin Panel</h2>
      <div className="custom-tabs mb-4" role="tablist" aria-label="Admin Panel tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`custom-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            tabIndex={activeTab === tab.key ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section role="tabpanel">
        {renderTabContent()}
      </section>
    </div>
  );
}
