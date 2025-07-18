import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

function BatchProcessingModal({ logs, onClose }) {
  return (
    <div className="modal-backdrop" style={{
      position: "fixed", top:0, left:0, right:0, bottom:0,
      backgroundColor: "rgba(0,0,0,0.5)", display:"flex",
      justifyContent:"center", alignItems:"center", zIndex: 1050
    }}>
      <div style={{
        backgroundColor: "#fff", padding: 20, borderRadius: 8,
        width: "90%", maxWidth: 600, maxHeight: "70vh", overflowY: "auto"
      }}>
        <h5>Batch obrada mailova u tijeku</h5>
        <pre style={{ whiteSpace: "pre-wrap", maxHeight: "60vh", overflowY: "auto", fontSize: "0.9em" }}>
          {logs.length ? logs.join("\n") : "Čekanje na početak obrade..."}
        </pre>
        <button className="btn btn-secondary mt-3" onClick={onClose}>Zatvori</button>
      </div>
    </div>
  );
}

export default function MailClient() {
  const [loading, setLoading] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Dohvati broj mailova za obradu
  const fetchPendingCount = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/mail_processing/mail/list");
      setPendingCount(res.data.length);
    } catch {
      toast.error("Greška pri dohvaćanju mailova");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, []);

  // Funkcija za batch obradu s real-time logovima (polling)
  const handleBatchProcess = async () => {
    setBatchProcessing(true);
    setLogs([]);
    setShowModal(true);

    try {
      const res = await axios.post("/api/mail_processing/mail/process-batch");
      
      // U ovom trenutku backend vraća sve rezultate batch obrade,
      // možemo ih prikazati kao logove
      const detailsLogs = res.data.details.map(
        (item, i) => `[${i+1}] UID: ${item.uid}, file: ${item.filename}`
      );
      
      setLogs(prev => [...prev, `Batch obrada završena. Obrađeno ${res.data.processed} attachmenta.`, ...detailsLogs]);
      
      await fetchPendingCount();
      toast.success(`Batch obrada završena: obrađeno ${res.data.processed} attachmenta.`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Greška u batch obradi");
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
    <div style={{ maxWidth: 600, margin: "20px auto", padding: 15 }}>
      <h3>Batch obrada mailova s PDF privicima</h3>
      <p>
        Mailova za obradu: <strong>{loading ? "Učitavanje..." : pendingCount}</strong>
      </p>
      <button
        onClick={handleBatchProcess}
        disabled={batchProcessing || loading || pendingCount === 0}
        className="btn btn-success"
      >
        {batchProcessing ? "Obrada u tijeku..." : "Batch obradi sve"}
      </button>

      {showModal && <BatchProcessingModal logs={logs} onClose={closeModal} />}
    </div>
  );
}
