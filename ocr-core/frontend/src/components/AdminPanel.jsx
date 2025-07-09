import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    if (!newUser.username) return toast.warning("Unesi korisničko ime");
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
    if (!editingUser.username) return toast.warning("Unesi korisničko ime");
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
    </div>
  );
}
