import React, { useState, useEffect, useRef } from "react";

export default function Validation() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!loading) return;

    wsRef.current = new WebSocket("ws://192.168.100.252:8000/api/documents/validation/ws/validate-progress");

    wsRef.current.onopen = () => {
      setLogs((logs) => [...logs, "WebSocket connected, validacija pokrenuta..."]);
    };

    wsRef.current.onmessage = (event) => {
      setLogs((logs) => [...logs, event.data]);
    };

    wsRef.current.onclose = () => {
      setLogs((logs) => [...logs, "WebSocket disconnected."]);
      setLoading(false);
    };

    wsRef.current.onerror = (error) => {
      setLogs((logs) => [...logs, "WebSocket error: " + error.message]);
      setLoading(false);
    };

    return () => {
      wsRef.current.close();
    };
  }, [loading]);

  function handleValidate() {
    setLogs([]);
    setLoading(true);
  }

  return (
    <div className="container mt-4">
      <h3>Validacija i klasifikacija dokumenata</h3>
      <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
        {loading ? "Obrada..." : "Pokreni validaciju i klasifikaciju"}
      </button>
      <div
        style={{
          marginTop: 20,
          padding: 10,
          backgroundColor: "#f0f0f0",
          height: 300,
          overflowY: "scroll",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          border: "1px solid #ccc",
        }}
      >
        {logs.length === 0 ? "Nema poruka..." : logs.join("\n")}
      </div>
    </div>
  );
}
