import React, { useEffect, useState } from "react";
import { Table, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Partneri() {
  const [partneri, setPartneri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/partneri")
      .then((res) => {
        if (!res.ok) throw new Error(`Greška: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => setPartneri(data))
      .catch((err) => toast.error("❌ " + err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleInputChange(id, field, value) {
    setPartneri((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  }

  async function handleSave(partner) {
    try {
      const res = await fetch(`/api/partneri/${partner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partner),
      });
      if (!res.ok) throw new Error("Greška pri spremanju partnera");
      toast.success("✅ Partner spremljen");
    } catch (err) {
      toast.error("❌ " + err.message);
    }
  }

  const filtered = partneri.filter((p) =>
    [p.naziv, p.oib, p.kontakt_osoba].some((field) =>
      field?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-4">📒 Partneri</h2>

      <Form.Control
        type="text"
        placeholder="🔍 Pretraži po nazivu, OIB-u ili kontakt osobi..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-3"
      />

      {loading ? (
        <div className="text-center"><Spinner animation="border" /></div>
      ) : (
        <div className="card shadow-sm border rounded">
          <div className="card-body p-0">
            <Table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Naziv</th>
                  <th>OIB</th>
                  <th>Adresa</th>
                  <th>Telefon</th>
                  <th>Email</th>
                  <th>Kontakt osoba</th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center">Nema partnera za prikaz</td></tr>
                ) : (
                  filtered.map((partner) => (
                    <tr key={partner.id}>
                      <td>
                        <button
                          className="btn btn-link p-0 text-decoration-underline"
                          onClick={() => navigate(`/documents/partner/${partner.oib}`)}
                        >
                          {partner.naziv}
                        </button>
                      </td>
                      <td>{partner.oib}</td>
                      <td>{partner.adresa}</td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={partner.kontakt_telefon || ""}
                          onChange={(e) => handleInputChange(partner.id, "kontakt_telefon", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="email"
                          value={partner.kontakt_email || ""}
                          onChange={(e) => handleInputChange(partner.id, "kontakt_email", e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={partner.kontakt_osoba || ""}
                          onChange={(e) => handleInputChange(partner.id, "kontakt_osoba", e.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleSave(partner)}
                        >
                          Spremi
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
