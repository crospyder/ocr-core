import React from "react";
import { Route, Routes } from "react-router-dom";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Config from "./pages/Config";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";

export default function BillingRouter() {
  return (
    <Routes>
      <Route path="products" element={<Products />} />
      <Route path="services" element={<Services />} />
      <Route path="config" element={<Config />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="invoice-create" element={<InvoiceForm mode="racun" />} />
      <Route path="offer-create" element={<InvoiceForm mode="ponuda" />} />
      <Route path="delivery-note-create" element={<InvoiceForm mode="racun-otpremnica" />} />
    </Routes>
  );
}
