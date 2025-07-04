import React, { useState, useEffect } from "react";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newUser, setNewUser] = useState({ username: "", role: "user" });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Greška pri dohvaćanju korisnika");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser() {
    // Validacija inputa
    if (!newUser.username) {
      alert("Unesi korisničko ime");
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
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm("Jeste li sigurni da želite obrisati korisnika?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Greška pri brisanju korisnika");
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUpdateUser() {
    if (!editingUser.username) {
      alert("Unesi korisničko ime");
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
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Master Admin Panel</h1>

      {loading && <p>Učitavanje korisnika...</p>}
      {error && <p className="text-red-600">Greška: {error}</p>}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Dodaj novog korisnika</h2>
        <input
          type="text"
          placeholder="Korisničko ime"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          className="border p-2 mr-2 rounded"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="master">Master Admin</option>
        </select>
        <button
          onClick={handleAddUser}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Dodaj
        </button>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Popis korisnika</h2>
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">ID</th>
              <th className="border border-gray-300 px-4 py-2">Korisničko ime</th>
              <th className="border border-gray-300 px-4 py-2">Uloga</th>
              <th className="border border-gray-300 px-4 py-2">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2">{user.id}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {editingUser?.id === user.id ? (
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, username: e.target.value })
                      }
                      className="border p-1 rounded"
                    />
                  ) : (
                    user.username
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {editingUser?.id === user.id ? (
                    <select
                      value={editingUser.role}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, role: e.target.value })
                      }
                      className="border p-1 rounded"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="master">Master Admin</option>
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 space-x-2">
                  {editingUser?.id === user.id ? (
                    <>
                      <button
                        onClick={handleUpdateUser}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Spremi
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                      >
                        Odustani
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      >
                        Uredi
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
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
      </section>
    </div>
  );
}
