import React, { useEffect, useState } from "react";
import { Table, Container, Spinner } from "react-bootstrap";

export default function Partners() {
  const [partneri, setPartneri] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/partneri")
      .then((res) => res.json())
      .then((data) => {
        setPartneri(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        // možeš dodati error handling
      });
  }, []);

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Partneri</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>OIB</th>
            <th>Adresa</th>
            <th>Kontakt telefon</th>
            <th>Kontakt email</th>
            <th>Kontakt osoba</th>
          </tr>
        </thead>
        <tbody>
          {partneri.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center">
                Nema partnera za prikaz
              </td>
            </tr>
          ) : (
            partneri.map((partner) => (
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
