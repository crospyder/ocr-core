import React, { useEffect, useState } from "react";
import { Table, Container, Spinner, Form } from "react-bootstrap";
import { toast } from "react-toastify";

export default function Partners() {
  const [partneri, setPartneri] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("naziv");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetch("/api/partneri")
      .then((res) => {
         if (!res.ok) throw new Error(`Greška: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        setPartneri(data);
        setFiltered(data);
      })
      .catch((err) => {
        toast.error("❌ " + err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = [...partneri];
    if (searchTerm.trim() !== "") {
      list = list.filter((p) =>
        [p.naziv, p.oib, p.kontakt_osoba].some((field) =>
          field?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    list.sort((a, b) => {
      const valA = a[sortField]?.toLowerCase?.() || "";
      const valB = b[sortField]?.toLowerCase?.() || "";
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    setFiltered(list);
  }, [searchTerm, sortField, sortAsc, partneri]);

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4">📒 Partneri</h2>

      <Form.Control
        type="text"
        placeholder="🔍 Pretraži po nazivu, OIB-u ili kontakt osobi..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-3"
      />

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th onClick={() => handleSort("naziv")} style={{ cursor: "pointer" }}>
              Naziv {sortField === "naziv" && (sortAsc ? "↑" : "↓")}
            </th>
            <th onClick={() => handleSort("oib")} style={{ cursor: "pointer" }}>
              OIB {sortField === "oib" && (sortAsc ? "↑" : "↓")}
            </th>
            <th>Adresa</th>
            <th>Kontakt telefon</th>
            <th>Kontakt email</th>
            <th>Kontakt osoba</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center">
                Nema partnera za prikaz
              </td>
            </tr>
          ) : (
            filtered.map((partner) => (
              <tr key={partner.id}>
                <td>{partner.naziv}</td>
                <td>{partner.oib}</td>
                <td>{partner.adresa}</td>
                <td>{partner.kontakt_telefon || "-"}</td>
                <td>{partner.kontakt_email || "-"}</td>
                <td>{partner.kontakt_osoba || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </Container>
  );
}
