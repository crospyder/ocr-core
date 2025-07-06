// 📄 relativna putanja: src/pages/Home.jsx

import React, { useEffect, useRef, useState } from "react";
import DocumentsUpload from "../DocumentsUpload";
import DocumentCard from "../DocumentCard";
import LoadingModal from "../LoadingModal";

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  const [backendLog, setBackendLog] = useState([]);
  const [showLoading, setShowLoading] = useState(false);
  const debugEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    fetchBackendLog();
  }, []);

  useEffect(() => {
    debugEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [debugLog]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Greška pri dohvaćanju dokumenata");
      const data = await res.json();
      setDocuments(data);
      setDebugLog((prev) => [...prev, `📥 Dohvaćeno ${data.length} dokumenata`]);
    } catch (err) {
      setError(err.message);
      setDebugLog((prev) => [...prev, `❌ Greška: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackendLog = async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setBackendLog(data.logs || []);
    } catch {
      setBackendLog(["⚠️ Nema pristupa backend logovima"]);
    }
  };

  return (
    <div className="flex flex-col gap-8 px-6 py-6">
      <LoadingModal visible={showLoading} />
      <DocumentsUpload
        onUploadComplete={() => {
          fetchDocuments();
          fetchBackendLog();
          setDebugLog((prev) => [...prev, "✅ Upload završen."]);
        }}
        onDebug={(msg) => setDebugLog((prev) => [...prev, msg])}
        onLoading={setShowLoading}
      />

      <section>
        <h2 className="text-2xl font-semibold text-blue-900 border-b pb-1 mb-4">
          Lista dokumenata
        </h2>

        {loading && <p className="text-blue-500 animate-pulse">Učitavanje...</p>}
        {error && <p className="text-red-500 font-semibold">{error}</p>}
        {!loading && documents.length === 0 && (
          <p className="italic text-gray-400">Nema dokumenata za prikaz.</p>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              title={doc.filename}
              partner={doc.supplier?.naziv_firme || "Nepoznat partner"}
              date={doc.date || "Nepoznat datum"}
              amount={doc.amount || "-"}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="debug-console">
          <h2 className="text-xl font-bold mb-2 border-b pb-1">🧪 Frontend Debug</h2>
          {debugLog.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          <div ref={debugEndRef} />
        </div>

        <div className="debug-console">
          <h2 className="text-xl font-bold mb-2 border-b pb-1">⚙️ Backend logovi</h2>
          {backendLog.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
