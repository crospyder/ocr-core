import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

// Helper za slanje logova na backend
async function backendLog({ message, level = "info", extra = "" }) {
  try {
    await fetch("/api/logs/frontend-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, level, extra }),
    });
  } catch (e) {
    console.warn("Neuspješno slanje loga na backend:", e);
  }
}

// LogViewer komponenta – automatski scrolla na dno i ima moderan prikaz s bojama
function LogViewer({ service, title }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const logRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = () => {
      fetch(`/api/admin/logs/${service}?lines=400`)
        .then((res) => res.json())
        .then((data) => {
          if (mounted) {
            const lines = data.logs ? data.logs.split("\n") : [];
            setLogs(lines);
            setLoading(false);
          }
        });
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [service]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Bojanje linija prema sadržaju i vrsti servisa
  const getLineStyle = (line) => {
    if (/error/i.test(line)) return { color: "red" };
    if (/warn/i.test(line)) return { color: "orange" };
    if (service === "ocr-core-frontend") return { color: "white" };
    // Backend logovi svijetlosivi
    return { color: "#ccc" };
  };

  return (
    <div className="card shadow border-0 my-4" style={{ background: "#181f2b" }}>
      <div
        className="card-header text-white fw-bold"
        style={{
          background: "linear-gradient(90deg, #2841a5 0%, #111d4a 100%)",
          fontSize: 17,
          letterSpacing: 0.3,
        }}
      >
        <i className="bi bi-terminal me-2"></i> {title}
      </div>
      <div
        ref={logRef}
        style={{
          background: "#151c26",
          fontFamily: "JetBrains Mono, Fira Mono, Menlo, monospace",
          height: 340,
          overflowY: "auto",
          fontSize: 14,
          padding: 16,
          borderRadius: "0 0 12px 12px",
          letterSpacing: 0.1,
          borderBottom: "2px solid #334",
          whiteSpace: "pre-wrap",
        }}
      >
        {loading
          ? "Učitavanje logova..."
          : logs.length === 0
          ? <em>Nema logova.</em>
          : logs.map((line, idx) => (
              <div key={idx} style={getLineStyle(line)}>
                {line}
              </div>
            ))
        }
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: "", role: "user" });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Greška pri dohvatu korisnika");
      const data = await res.json();
      setUsers(data);
      await backendLog({ message: "Korisnici dohvaćeni", level: "info" });
    } catch (err) {
      toast.error(err.message);
      await backendLog({ message: "Greška pri dohvatu korisnika", level: "error", extra: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!newUser.username) {
      toast.warning("Unesi korisničko ime");
      await backendLog({ message: "Pokušaj dodavanja korisnika bez imena", level: "warning" });
      return;
    }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error("Greška pri dodavanju korisnika");
      setNewUser({ username: "", role: "user" });
      fetchUsers();
      toast.success("Korisnik uspješno dodan");
      await backendLog({ message: `Korisnik dodan: ${newUser.username}`, level: "info" });
    } catch (err) {
      toast.error(err.message);
      await backendLog({ message: "Greška pri dodavanju korisnika", level: "error", extra: err.message });
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm("Jeste li sigurni da želite obrisati korisnika?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Greška pri brisanju korisnika");
      fetchUsers();
      toast.success("Korisnik obrisan");
      await backendLog({ message: `Korisnik obrisan, ID: ${id}`, level: "info" });
    } catch (err) {
      toast.error(err.message);
      await backendLog({ message: "Greška pri brisanju korisnika", level: "error", extra: err.message });
    }
  }

  async function handleUpdateUser() {
    if (!editingUser.username) {
      toast.warning("Unesi korisničko ime");
      await backendLog({ message: "Pokušaj ažuriranja korisnika bez imena", level: "warning" });
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });
      if (!res.ok) throw new Error("Greška pri ažuriranju korisnika");
      setEditingUser(null);
      fetchUsers();
      toast.success("Korisnik ažuriran");
      await backendLog({ message: `Korisnik ažuriran, ID: ${editingUser.id}`, level: "info" });
    } catch (err) {
      toast.error(err.message);
      await backendLog({ message: "Greška pri ažuriranju korisnika", level: "error", extra: err.message });
    }
  }

  return (
    <div className="container-fluid">
      <div className="document-stats-widget mb-4">
        <h5>Dodaj novog korisnika</h5>
        <div className="d-flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Korisničko ime"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            className="form-control form-control-sm w-auto"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="form-select form-select-sm w-auto"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="master">Master</option>
          </select>
          <button className="btn btn-sm btn-success" onClick={handleAddUser}>
            Dodaj korisnika
          </button>
        </div>
      </div>

      <div className="recent-documents-widget">
        <h5>Popis korisnika</h5>
        {loading ? (
          <p>Učitavanje...</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Korisničko ime</th>
                  <th>Uloga</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <input
                          className="form-control form-control-sm"
                          value={editingUser.username}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, username: e.target.value })
                          }
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <select
                          className="form-select form-select-sm"
                          value={editingUser.role}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, role: e.target.value })
                          }
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="master">Master</option>
                        </select>
                      ) : (
                        user.role
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <>
                          <button
                            className="btn btn-sm btn-primary me-2"
                            onClick={handleUpdateUser}
                          >
                            Spremi
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingUser(null)}
                          >
                            Odustani
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-sm btn-warning me-2"
                            onClick={() => setEditingUser(user)}
                          >
                            Uredi
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Obriši
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODERNI LOG VIEWER SAMO JEDAN === */}
      <LogViewer service="ocr-core-backend" title="Syslogs" />
    </div>
  );
}
