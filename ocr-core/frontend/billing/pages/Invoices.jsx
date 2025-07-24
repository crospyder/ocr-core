import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/billing/invoices/");
      setInvoices(res.data);
    } catch {
      alert("Greška pri dohvaćanju faktura");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) return <div>Učitavanje faktura...</div>;
  if (invoices.length === 0) return <div>Nema faktura za prikaz.</div>;

  return (
    <div className="container">
      <h2>Fakture</h2>
      <table className="invoice-table-excel w-100">
        <thead>
          <tr>
            <th>Broj</th>
            <th>Partner</th>
            <th>Tip</th>
            <th>Datum izdavanja</th>
            <th>Datum valute</th>
            <th>Ukupno</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.dokument_broj}</td>
              <td>{inv.partner_id}</td>
              <td>{inv.tip_dokumenta}</td>
              <td>{new Date(inv.datum_izdavanja).toLocaleDateString()}</td>
              <td>{new Date(inv.datum_valute).toLocaleDateString()}</td>
              <td>{inv.ukupno.toFixed(2)}</td>
              <td>{inv.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
