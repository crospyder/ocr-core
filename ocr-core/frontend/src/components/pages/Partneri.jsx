import React, { useEffect, useState } from "react";
import { Table, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Partneri() {
  const [partneri, setPartneri] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
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

  function handleEdit(partner) {
    setEditId(partner.id);
    setEditData({
      kontakt_telefon: partner.kontakt_telefon || "",
      kontakt_email: partner.kontakt_email || "",
      kontakt_osoba: partner.kontakt_osoba || "",
    });
  }

  function handleInputChange(field, value) {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleCancel() {
    setEditId(null);
    setEditData({});
  }

  async function handleSave(partner) {
    const updatedPartner = {
      ...partner,
      kontakt_telefon: editData.kontakt_telefon,
      kontakt_email: editData.kontakt_email,
      kontakt_osoba: editData.kontakt_osoba,
    };
    try {
      const res = await fetch(`/api/partneri/${partner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPartner),
      });
      if (!res.ok) throw new Error("Greška pri spremanju partnera");
      setPartneri((prev) =>
        prev.map((p) => (p.id === partner.id ? updatedPartner : p))
      );
      toast.success("✅ Partner spremljen");
      setEditId(null);
      setEditData({});
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
      <h2 className="mb-4">
        <span role="img" aria-label="notebook" className="me-2">📒</span>
        Partneri
      </h2>

      <Form.Control
        type="text"
        placeholder="🔍 Pretraži po nazivu, OIB-u ili kontakt osobi..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-3"
        autoFocus
      />

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <div className="card shadow-sm border rounded">
          <div className="card-body p-0">
            <div style={{ overflowX: "auto" }}>
              <Table className="table table-hover partner-table mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="partner-naziv text-start">Naziv</th>
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
                    <tr>
                      <td colSpan={7} className="text-center">
                        Nema partnera za prikaz
                      </td>
                    </tr>
                  ) : (
                    filtered.map((partner) => {
                      const isEditing = editId === partner.id;
                      return (
                        <tr key={partner.id}>
                          <td className="partner-naziv text-start">
                            <button
                              className="btn btn-link p-0 text-decoration-underline"
                              onClick={() =>
                                navigate(`/documents/partner/${partner.oib}`)
                              }
                              tabIndex={-1}
                            >
                              {partner.naziv}
                            </button>
                          </td>
                          <td>{partner.oib}</td>
                          <td>{partner.adresa}</td>
                          <td>
                            {isEditing ? (
                              <Form.Control
                                size="sm"
                                type="text"
                                value={editData.kontakt_telefon}
                                onChange={(e) =>
                                  handleInputChange(
                                    "kontakt_telefon",
                                    e.target.value
                                  )
                                }
                                placeholder="Telefon"
                                autoFocus
                              />
                            ) : (
                              partner.kontakt_telefon || (
                                <span className="text-muted">-</span>
                              )
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <Form.Control
                                size="sm"
                                type="email"
                                value={editData.kontakt_email}
                                onChange={(e) =>
                                  handleInputChange(
                                    "kontakt_email",
                                    e.target.value
                                  )
                                }
                                placeholder="Email"
                              />
                            ) : (
                              partner.kontakt_email || (
                                <span className="text-muted">-</span>
                              )
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <Form.Control
                                size="sm"
                                type="text"
                                value={editData.kontakt_osoba}
                                onChange={(e) =>
                                  handleInputChange(
                                    "kontakt_osoba",
                                    e.target.value
                                  )
                                }
                                placeholder="Kontakt osoba"
                              />
                            ) : (
                              partner.kontakt_osoba || (
                                <span className="text-muted">-</span>
                              )
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <>
                                <button
                                  className="btn btn-sm btn-success me-2"
                                  onClick={() => handleSave(partner)}
                                >
                                  💾 Spremi
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={handleCancel}
                                >
                                  Odustani
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => handleEdit(partner)}
                              >
                                ✏️ Uredi
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
