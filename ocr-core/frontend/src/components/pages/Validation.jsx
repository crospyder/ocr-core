import React, { useState, useEffect, useRef } from "react";

const API_BASE_URL = "http://10.0.1.252:8000";

const TAG_CLASSES = {
  URA: "doc-tag ura",
  IRA: "doc-tag ira",
  UGOVOR: "doc-tag ugovor",
  IZVOD: "doc-tag izvod",
  OSTALO: "doc-tag ostalo",
  NEPOZNATO: "doc-tag nepoznato",
};

export default function Validation() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlyNew, setOnlyNew] = useState(true);
  const wsRef = useRef(null);

  const [unknownDocs, setUnknownDocs] = useState([]);
  const [foreignDocs, setForeignDocs] = useState([]);
  const [updatingDocId, setUpdatingDocId] = useState(null);

  useEffect(() => {
    if (!loading) return;

    const wsUrl = `${API_BASE_URL.replace("http", "ws")}/api/documents/ws/validate-progress?only_new=${onlyNew}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setLogs(["WebSocket connected, validacija pokrenuta..."]);
    };

    wsRef.current.onmessage = (event) => {
      setLogs((logs) => [event.data, ...logs]);
    };

    wsRef.current.onclose = () => {
      setLogs((logs) => ["WebSocket disconnected.", ...logs]);
      setLoading(false);
      fetchUnknownDocs();
      fetchForeignDocs();
    };

    wsRef.current.onerror = (error) => {
      setLogs((logs) => [`WebSocket error: ${error.message}`, ...logs]);
      setLoading(false);
    };

    return () => {
      wsRef.current && wsRef.current.close();
    };
  }, [loading, onlyNew]);

  useEffect(() => {
    fetchUnknownDocs();
    fetchForeignDocs();
  }, []);

  async function fetchUnknownDocs() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents?document_type=NEPOZNATO&page=1&page_size=100`);
      if (!res.ok) throw new Error("Greška pri dohvatu nepoznatih dokumenata");
      const data = await res.json();
      setUnknownDocs(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setLogs((logs) => [`Greška: ${err.message}`, ...logs]);
    }
  }

  async function fetchForeignDocs() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents?predlozi_izbacivanje=true&page=1&page_size=100`);
      if (!res.ok) throw new Error("Greška pri dohvatu potencijalno tuđih dokumenata");
      const data = await res.json();
      setForeignDocs(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setLogs((logs) => [`Greška: ${err.message}`, ...logs]);
    }
  }

  async function updateDocumentType(id, newType) {
    setUpdatingDocId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}/update_type`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_type: newType }),
      });
      if (!res.ok) throw new Error("Greška pri ažuriranju tipa dokumenta");
      setUnknownDocs((docs) => docs.filter((doc) => doc.id !== id));
      setForeignDocs((docs) => docs.filter((doc) => doc.id !== id));
      setLogs((logs) => [`Dokument ${id} promijenjen u ${newType}`, ...logs]);
    } catch (err) {
      setLogs((logs) => [`Greška pri updateu: ${err.message}`, ...logs]);
    } finally {
      setUpdatingDocId(null);
    }
  }

  async function deleteDocument(id) {
    setUpdatingDocId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Greška pri brisanju dokumenta");
      setUnknownDocs((docs) => docs.filter((doc) => doc.id !== id));
      setForeignDocs((docs) => docs.filter((doc) => doc.id !== id));
      setLogs((logs) => [`Dokument ${id} obrisan`, ...logs]);
    } catch (err) {
      setLogs((logs) => [`Greška pri brisanju: ${err.message}`, ...logs]);
    } finally {
      setUpdatingDocId(null);
    }
  }

  function handleEdit(id) {
    window.open(`/documents/${id}`, "_blank");
  }

  function handleValidate() {
    setLogs([]);
    setLoading(true);
  }

  return (
    <div className="container mt-2 validation-container min-vh-75">
      <pre className="validation-logs monospace p-2 mb-3 rounded shadow">
        {logs.length === 0 ? "Nema poruka..." : logs.join("\n")}
      </pre>

      <div className="mb-3 d-flex align-items-center gap-3">
        <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
          {loading ? "Obrada..." : "Pokreni validaciju i klasifikaciju"}
        </button>
        <label className="form-check-label">
          <input
            type="checkbox"
            className="form-check-input me-1"
            checked={onlyNew}
            onChange={(e) => setOnlyNew(e.target.checked)}
            disabled={loading}
          />
          Samo novi dokumenti
        </label>
      </div>

      <div className="text-center fw-bold mb-3 validation-info">
        Ovo su dokumenti koje je naš AI sustav prepoznao kao dokumente koji trebaju vašu intervenciju
      </div>

      <div className="d-flex gap-3 validation-tables-container">
        <section className="flex-grow-1 overflow-auto border rounded p-3 validation-table-wrapper">
          <h4>Nepoznatih dokumenata: {unknownDocs.length}</h4>
          {unknownDocs.length === 0 ? (
            <p>Nema nepoznatih dokumenata.</p>
          ) : (
            <DocumentTable
              documents={unknownDocs}
              updatingDocId={updatingDocId}
              updateDocumentType={updateDocumentType}
              deleteDocument={deleteDocument}
              handleEdit={handleEdit}
            />
          )}
        </section>

        <section className="flex-grow-1 overflow-auto border rounded p-3 validation-table-wrapper">
          <h4>Potencijalno tuđih dokumenata: {foreignDocs.length}</h4>
          {foreignDocs.length === 0 ? (
            <p>Nema potencijalno tuđih dokumenata.</p>
          ) : (
            <DocumentTable
              documents={foreignDocs}
              updatingDocId={updatingDocId}
              updateDocumentType={updateDocumentType}
              deleteDocument={deleteDocument}
              handleEdit={handleEdit}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentTable({ documents, updatingDocId, updateDocumentType, deleteDocument, handleEdit }) {
  return (
    <table className="table table-striped table-hover" style={{ fontSize: 14 }}>
      <thead>
        <tr>
          <th>Izdao</th>
          <th>ID</th>
          <th>Naziv</th>
          <th>Tip</th>
          <th>Akcije</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <React.Fragment key={doc.id}>
            <tr>
              <td>{doc.partner_name_ocr || "-"}</td>
              <td>{doc.id}</td>
              <td>
                <a href={`/documents/${doc.id}`} target="_blank" rel="noreferrer">
                  {doc.filename}
                </a>
              </td>
              <td>
                <span className={TAG_CLASSES[doc.document_type] || "doc-tag"}>
                  {doc.document_type}
                </span>
              </td>
              <td className="table-actions d-flex gap-1">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => updateDocumentType(doc.id, doc.document_type)}
                  disabled={updatingDocId === doc.id}
                  title="Ispravno"
                >
                  Ispravno
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleEdit(doc.id)}
                  disabled={updatingDocId === doc.id}
                  title="Uredi"
                >
                  Uredi
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => deleteDocument(doc.id)}
                  disabled={updatingDocId === doc.id}
                  title="Obriši"
                >
                  Obriši
                </button>
              </td>
            </tr>
            <tr>
              <td colSpan={5} style={{ paddingLeft: 50 }}>
                {doc.predlozi_izbacivanje ? (
                  <span style={{ color: "red", fontWeight: "bold" }}>⚠️ Nije razriješeno</span>
                ) : (
                  <span style={{ color: "green", fontWeight: "bold" }}>✔️ Razriješeno</span>
                )}
              </td>
            </tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
