import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// Modal s logovima batch obrade
function BatchProcessingModal({ logs, onClose }) {
  return (
    <div className="modal-backdrop d-flex align-center justify-center">
      <div
        className="modal-card"
        style={{ maxWidth: 600, width: "95%", maxHeight: "75vh", overflowY: "auto", padding: 0 }}
      >
        <div className="modal-header fw-bold">Batch obrada mailova u tijeku</div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              maxHeight: "56vh",
              overflowY: "auto",
              background: "#f7f9fb",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.97em",
              marginBottom: "0"
            }}
          >
            {logs.length ? logs.join("\n") : "Čekanje na početak obrade..."}
          </pre>
        </div>
        <div className="modal-footer d-flex justify-end">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MailClient() {
  const [loading, setLoading] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [fetchedHeaders, setFetchedHeaders] = useState([]);
  

  const fetchPendingCount = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/mail_processing/mail/list");
      setPendingCount(res.data.length);
      setFetchedHeaders(res.data.map(item => ({ uid: item.uid, filename: item.filename })));
      setLastFetchTime(new Date());
    } catch {
      toast.error("Greška pri dohvaćanju mailova");
    } finally {
      setLoading(false);
    }
  };

  // Batch obrada (trigger + logovi)
  const handleBatchProcess = async () => {
    setBatchProcessing(true);
    setLogs([]);
    setShowModal(true);

    try {
      const res = await axios.post("/api/mail_processing/mail/process-batch");

      const detailsLogs = res.data.details.map(
        (item, i) => `[${i + 1}] UID: ${item.uid}, file: ${item.filename}`
      );

      setLogs(prev => [
        ...prev,
        `Batch obrada završena. Obrađeno ${res.data.processed} attachmenta.`,
        ...detailsLogs
      ]);

      await fetchPendingCount();
      toast.success(`Batch obrada završena: obrađeno ${res.data.processed} attachmenta.`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Greška u batch obradi");
      setLogs(prev => [...prev, "Greška tijekom obrade!"]);
    } finally {
      setBatchProcessing(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setLogs([]);
  };

  return (
    <div
      className="card card-compact shadow p-2"
      style={{ maxWidth: 600, margin: "2.2rem auto" }}
    >
      <h3 className="fw-bold mb-2">Batch obrada mailova s PDF privicima</h3>

      <div className="mb-3">
        <button
          onClick={fetchPendingCount}
          disabled={loading}
          className="btn btn-primary mb-2"
        >
          {loading ? "Dohvaćanje..." : "Dohvati nove neobrađene mailove"}
        </button>
        {lastFetchTime && (
          <p>
            Zadnje dohvaćanje:{" "}
            <strong>{lastFetchTime.toLocaleString("hr-HR")}</strong>, mailova za obradu:{" "}
            <strong>{pendingCount}</strong>
          </p>
        )}
      </div>

      <button
        onClick={handleBatchProcess}
        disabled={batchProcessing || loading || !pendingCount}
        className="btn btn-success mb-2"
      >
        {batchProcessing ? "Obrada u tijeku..." : "Batch obradi sve"}
      </button>

      {fetchedHeaders.length > 0 && (
        <div className="mail-headers-list" style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #ccc", borderRadius: 6, padding: "0.5rem" }}>
          <strong>Prethodno dohvaćeni mailovi:</strong>
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            {fetchedHeaders.map(({ uid, filename }) => (
              <li key={uid}>
                UID: {uid} - {filename}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && <BatchProcessingModal logs={logs} onClose={closeModal} />}
    </div>
  );
}
