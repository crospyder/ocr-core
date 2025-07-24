// #AdminPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

// --- LIVE AI trening log widget (WebSocket direktno na inference server) ---
function TrainingLogWidget() {
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    // PAZI: prilagodi IP/port svom inference serveru!
    wsRef.current = new window.WebSocket("ws://192.168.100.53:9000/ws/training-logs");
    wsRef.current.onmessage = (e) => {
      setLogs((prev) => [...prev, e.data]);
    };
    return () => wsRef.current && wsRef.current.close();
  }, []);

  return (
    <div className="card p-2 mb-2" style={{ maxHeight: 300, overflowY: "auto", fontFamily: "monospace", fontSize: 13 }}>
      <b>Trening log:</b>
      <div>
        {logs.length === 0
          ? <em style={{ color: "#888" }}>Nema logova...</em>
          : logs.map((log, i) => <div key={i}>{log}</div>)
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

  // --- Train Model button state
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainMsg, setTrainMsg] = useState("");

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Greška pri dohvatu korisnika");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!newUser.username) {
      toast.warning("Unesi korisničko ime");
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
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm("Jeste li sigurni da želite obrisati korisnika?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Greška pri brisanju korisnika");
      fetchUsers();
      toast.success("Korisnik obrisan");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleUpdateUser() {
    if (!editingUser.username) {
      toast.warning("Unesi korisničko ime");
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
    } catch (err) {
      toast.error(err.message);
    }
  }

  // --- Treniranje modela AI tipka ---
  async function handleTrainModel() {
    setTrainLoading(true);
    setTrainMsg("");
    try {
      // ADAPT URL ako inference nije na backend serveru!
      const res = await fetch("http://192.168.100.53:9000/api/train_model", {
        method: "POST",
      });
      const data = await res.json();
      setTrainMsg(data.message || "Treniranje pokrenuto!");
    } catch (err) {
      setTrainMsg("Greška pri treniranju: " + err.message);
    } finally {
      setTrainLoading(false);
    }
  }

  return (
    <div className="container mt-2">
      {/* --- Novi korisnik --- */}
      <div className="card card-compact mb-2">
        <div className="card-header">Dodaj novog korisnika</div>
        <div className="d-flex gap-2 align-center flex-wrap">
          <input
            type="text"
            placeholder="Korisničko ime"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            className="form-control w-auto"
            style={{ minWidth: 180, marginBottom: 0 }}
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="form-select w-auto"
            style={{ minWidth: 120, marginBottom: 0 }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="master">Master</option>
          </select>
          <button className="btn btn-success btn-sm" onClick={handleAddUser}>
            Dodaj korisnika
          </button>
        </div>
      </div>

      {/* --- Popis korisnika --- */}
      <div className="card card-compact mb-2">
        <div className="card-header">Popis korisnika</div>
        {loading ? (
          <div className="p-2 text-muted">Učitavanje...</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-striped">
              <thead>
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
                          className="form-control"
                          value={editingUser.username}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, username: e.target.value })
                          }
                          style={{ minWidth: 110, marginBottom: 0 }}
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <select
                          className="form-select"
                          value={editingUser.role}
                          onChange={(e) =>
                            setEditingUser({ ...editingUser, role: e.target.value })
                          }
                          style={{ minWidth: 80, marginBottom: 0 }}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="master">Master</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${user.role === "master" ? "danger" : user.role === "admin" ? "success" : "secondary"}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingUser?.id === user.id ? (
                        <>
                          <button
                            className="btn btn-success btn-xs me-2"
                            onClick={handleUpdateUser}
                          >
                            Spremi
                          </button>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => setEditingUser(null)}
                          >
                            Odustani
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-warning btn-xs me-2"
                            onClick={() => setEditingUser(user)}
                          >
                            Uredi
                          </button>
                          <button
                            className="btn btn-danger btn-xs"
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

      {/* --- Pokreni treniranje AI modela --- */}
      <div className="card card-compact mb-3 p-3" style={{background: "#20294a"}}>
        <button
          className="btn btn-primary"
          onClick={handleTrainModel}
          disabled={trainLoading}
          style={{ minWidth: 180 }}
        >
          {trainLoading ? "Treniranje..." : "Pokreni treniranje AI modela"}
        </button>
        {trainMsg && (
          <div style={{ color: "#8cf", marginTop: 8, fontSize: 15 }}>{trainMsg}</div>
        )}
      </div>

      {/* --- Live AI trening log --- */}
      <TrainingLogWidget />
    </div>
  );
}
