import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const MODES = {
  FACTURA: "racun",
  PONUDA: "ponuda",
  RACUN_OTPREMNICA: "racun-otpremnica",
};

export default function InvoiceForm({ mode = MODES.FACTURA, invoiceId = null }) {
  const tipDokumentaOptions = [
    { label: "Račun", value: "racun" },
    { label: "Ponuda", value: "ponuda" },
    { label: "Račun-Otpremnica", value: "racun-otpremnica" },
  ];

  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openOpisIndex, setOpenOpisIndex] = useState(null);

  // Autocomplete states
  const [productInput, setProductInput] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [serviceInput, setServiceInput] = useState("");
  const [filteredServices, setFilteredServices] = useState([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const productInputRef = useRef(null);
  const serviceInputRef = useRef(null);

  const [form, setForm] = useState({
    partner_id: "",
    dokument_broj: "",
    datum_izdavanja: new Date().toISOString().slice(0, 10),
    datum_valute: new Date(new Date().getTime() + 7 * 86400000).toISOString().slice(0, 10),
    tip_dokumenta: mode,
    stavke: [],
    ukupno: 0,
    ukupno_pdv: 0,
    status: "kreiran",
    placeno: false,
  });

  useEffect(() => {
    fetchPartners();
    fetchProducts();
    fetchServices();
    if (invoiceId) {
      fetchInvoice(invoiceId);
    } else {
      fetchLastDocumentNumber();
    }
    // eslint-disable-next-line
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await axios.get("/api/partneri");
      setPartners(res.data);
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/billing/products");
      setProducts(res.data);
    } catch {}
  };

  const fetchServices = async () => {
    try {
      const res = await axios.get("/billing/services");
      setServices(res.data);
    } catch {}
  };

  const fetchInvoice = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`/billing/invoices/${id}`);
      setForm({ ...res.data, tip_dokumenta: mode });
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const fetchLastDocumentNumber = async () => {
    try {
      const res = await axios.get(`/billing/invoices?limit=1&order=desc`);
      const lastInvoice = res.data[0];
      let lastNumber = 0;
      if (lastInvoice && lastInvoice.dokument_broj) {
        lastNumber = parseInt(lastInvoice.dokument_broj, 10) || 0;
      }
      setForm((f) => ({ ...f, dokument_broj: String(lastNumber + 1) }));
    } catch {
      setForm((f) => ({ ...f, dokument_broj: "1" }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Autocomplete proizvoda
  useEffect(() => {
    if (productInput.trim() === "") {
      setFilteredProducts([]);
      setShowProductDropdown(false);
    } else {
      const filt = products.filter(
        (p) =>
          p.naziv.toLowerCase().includes(productInput.toLowerCase()) ||
          p.sifra.toLowerCase().includes(productInput.toLowerCase())
      );
      setFilteredProducts(filt.slice(0, 8));
      setShowProductDropdown(true);
    }
  }, [productInput, products]);

  // Autocomplete usluga
  useEffect(() => {
    if (serviceInput.trim() === "") {
      setFilteredServices([]);
      setShowServiceDropdown(false);
    } else {
      const filt = services.filter(
        (s) =>
          s.naziv.toLowerCase().includes(serviceInput.toLowerCase()) ||
          s.sifra.toLowerCase().includes(serviceInput.toLowerCase())
      );
      setFilteredServices(filt.slice(0, 8));
      setShowServiceDropdown(true);
    }
  }, [serviceInput, services]);

  const addProductStavka = (product) => {
    if (!product) return;
    setForm((f) => ({
      ...f,
      stavke: [
        ...f.stavke,
        {
          proizvod_id: product.id,
          usluga_id: null,
          sifra: product.sifra,
          naziv: product.naziv,
          jedinica_mjere: product.jedinica_mjere,
          kolicina: 1,
          pdv_postotak: Number(product.pdv_postotak) || 25,
          cijena: Number(product.cijena),
          iznos: Number(product.cijena),
          dodatni_opis: "",
        },
      ],
    }));
    setProductInput("");
    setShowProductDropdown(false);
    productInputRef.current && productInputRef.current.focus();
  };

  const addServiceStavka = (service) => {
    if (!service) return;
    setForm((f) => ({
      ...f,
      stavke: [
        ...f.stavke,
        {
          proizvod_id: null,
          usluga_id: service.id,
          sifra: service.sifra,
          naziv: service.naziv,
          jedinica_mjere: service.jedinica_mjere,
          kolicina: 1,
          pdv_postotak: Number(service.pdv_postotak) || 25,
          cijena: Number(service.cijena),
          iznos: Number(service.cijena),
          dodatni_opis: "",
        },
      ],
    }));
    setServiceInput("");
    setShowServiceDropdown(false);
    serviceInputRef.current && serviceInputRef.current.focus();
  };

  const updateStavka = (index, key, value) => {
    setForm((f) => {
      const stavke = [...f.stavke];
      stavke[index][key] = value;

      const kolicina = parseFloat(stavke[index].kolicina) || 0;
      const cijena = parseFloat(stavke[index].cijena) || 0;
      stavke[index].iznos = parseFloat((kolicina * cijena).toFixed(2));

      return { ...f, stavke };
    });
  };

  const removeStavka = (index) => {
    setForm((f) => {
      const stavke = [...f.stavke];
      stavke.splice(index, 1);
      return { ...f, stavke };
    });
  };

  useEffect(() => {
    const ukupno = form.stavke.reduce((sum, s) => sum + (s.iznos || 0), 0);
    const ukupno_pdv = form.stavke.reduce(
      (sum, s) => sum + ((s.iznos * 25) / 100 || 0),
      0
    );
    setForm((f) => ({ ...f, ukupno, ukupno_pdv }));
    // eslint-disable-next-line
  }, [form.stavke]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partner_id) {
      console.error("Greška: Odaberi partnera");
      return;
    }
    if (form.stavke.length === 0) {
      console.error("Greška: Dodaj barem jednu stavku");
      return;
    }
    setSaving(true);
    try {
      const cleanStavke = form.stavke.map((s) => ({
        proizvod_id: s.proizvod_id,
        usluga_id: s.usluga_id,
        sifra: s.sifra,
        naziv: s.naziv,
        jedinica_mjere: s.jedinica_mjere,
        kolicina: s.kolicina,
        pdv_postotak: s.pdv_postotak,
        cijena: s.cijena,
        dodatni_opis: s.dodatni_opis || "",
        iznos: s.iznos,
      }));

      const payload = {
        ...form,
        stavke: cleanStavke,
        partner_id: Number(form.partner_id),
        datum_izdavanja: new Date(form.datum_izdavanja).toISOString(),
        datum_valute: new Date(form.datum_valute).toISOString(),
        tip_dokumenta: form.tip_dokumenta,
        account_id: 1,
      };
      console.log("Payload za backend:", payload);
      if (invoiceId) {
        await axios.put(`/billing/invoices/${invoiceId}`, payload);
      } else {
        await axios.post("/billing/invoices", payload);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        console.error("API error details:", err.response.data.detail || err.message);
        console.log("Full backend response:", JSON.stringify(err.response.data, null, 2));
      } else {
        console.error("API error details:", err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Učitavanje...</div>;

  return (
    <form className="invoice-form-card" onSubmit={handleSubmit}>
      <h2>
        {mode === MODES.FACTURA
          ? "Izrada Fakture"
          : mode === MODES.PONUDA
          ? "Izrada Ponude"
          : "Izrada Račun-Otpremnice"}
      </h2>
      <div className="invoice-form-row">
        <div className="invoice-form-group">
          <label htmlFor="partner_id">Partner:</label>
          <select
            name="partner_id"
            id="partner_id"
            className="form-select"
            value={form.partner_id || ""}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Odaberi partnera
            </option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.naziv} ({p.oib})
              </option>
            ))}
          </select>
        </div>
        <div className="invoice-form-group">
          <label htmlFor="dokument_broj">Broj dokumenta:</label>
          <input
            type="text"
            className="form-control"
            name="dokument_broj"
            id="dokument_broj"
            value={form.dokument_broj}
            onChange={handleChange}
            required
            readOnly
          />
        </div>
        <div className="invoice-form-group">
          <label htmlFor="tip_dokumenta">Tip dokumenta:</label>
          <select
            name="tip_dokumenta"
            id="tip_dokumenta"
            className="form-select"
            value={form.tip_dokumenta}
            onChange={handleChange}
            required
          >
            {tipDokumentaOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="invoice-form-group">
          <label htmlFor="datum_izdavanja">Datum izdavanja:</label>
          <input
            type="date"
            className="form-control"
            name="datum_izdavanja"
            id="datum_izdavanja"
            value={form.datum_izdavanja}
            onChange={handleChange}
            required
          />
        </div>
        <div className="invoice-form-group">
          <label htmlFor="datum_valute">Datum valute (rok plaćanja):</label>
          <input
            type="date"
            className="form-control"
            name="datum_valute"
            id="datum_valute"
            value={form.datum_valute}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* --- AUTOCOMPLETE PROIZVOD --- */}
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-md-6">
          <label>Proizvod</label>
          <input
            ref={productInputRef}
            type="text"
            className="form-control"
            placeholder="Počni tipkati naziv ili šifru proizvoda..."
            value={productInput}
            onChange={(e) => setProductInput(e.target.value)}
            autoComplete="off"
            onFocus={() => productInput && setShowProductDropdown(true)}
            onBlur={() => setTimeout(() => setShowProductDropdown(false), 120)}
          />
          {showProductDropdown && filteredProducts.length > 0 && (
            <div className="invoice-autocomplete-dropdown">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="invoice-autocomplete-item"
                  onMouseDown={() => addProductStavka(p)}
                  tabIndex={0}
                >
                  {p.naziv} <span className="text-muted">({p.sifra})</span> |{" "}
                  {Number(p.cijena).toFixed(2)} kn
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-md-6">
          <label>Usluga</label>
          <input
            ref={serviceInputRef}
            type="text"
            className="form-control"
            placeholder="Počni tipkati naziv ili šifru usluge..."
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            autoComplete="off"
            onFocus={() => serviceInput && setShowServiceDropdown(true)}
            onBlur={() => setTimeout(() => setShowServiceDropdown(false), 120)}
          />
          {showServiceDropdown && filteredServices.length > 0 && (
            <div className="invoice-autocomplete-dropdown">
              {filteredServices.map((s) => (
                <div
                  key={s.id}
                  className="invoice-autocomplete-item"
                  onMouseDown={() => addServiceStavka(s)}
                  tabIndex={0}
                >
                  {s.naziv} <span className="text-muted">({s.sifra})</span> |{" "}
                  {Number(s.cijena).toFixed(2)} kn
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <table className="invoice-table-excel">
        <thead>
          <tr>
            <th className="col-rb">#</th>
            <th className="col-sifra">Šifra</th>
            <th className="col-naziv">Naziv</th>
            <th className="col-jmj">J.mj</th>
            <th className="col-kolicina">Količina</th>
            <th className="col-pdv">PDV %</th>
            <th className="col-cijena">Cijena</th>
            <th className="col-pdviznos">PDV</th>
            <th className="col-bruto">Bruto</th>
            <th className="col-akcija">Akcija</th>
          </tr>
        </thead>
        <tbody>
          {form.stavke.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: "center", color: "#a3acba" }}>
                Dodajte proizvod ili uslugu
              </td>
            </tr>
          ) : (
            form.stavke.map((s, i) => {
              const pdvIznos = parseFloat(((s.iznos * 25) / 100).toFixed(2));
              const bruto = parseFloat((s.iznos + pdvIznos).toFixed(2));
              return (
                <React.Fragment key={i}>
                  <tr>
                    <td className="col-rb">{i + 1}</td>
                    <td className="col-sifra">
                      <input type="text" value={s.sifra} readOnly />
                    </td>
                    <td className="col-naziv">
                      <input type="text" value={s.naziv} readOnly />
                    </td>
                    <td className="col-jmj">
                      <input type="text" value={s.jedinica_mjere} readOnly />
                    </td>
                    <td className="col-kolicina">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={s.kolicina}
                        onChange={(e) =>
                          updateStavka(i, "kolicina", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="col-pdv">
                      <input type="number" value={s.pdv_postotak || 25} readOnly />
                    </td>
                    <td className="col-cijena">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={s.cijena}
                        onChange={(e) =>
                          updateStavka(i, "cijena", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="col-pdviznos">{pdvIznos.toFixed(2)}</td>
                    <td className="col-bruto">{bruto.toFixed(2)}</td>
                    <td className="col-akcija">
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeStavka(i)}
                        title="Obriši"
                      >
                        &#10006;
                      </button>
                    </td>
                  </tr>
                  <tr className="opis-collapse-row">
                    <td colSpan={10}>
                      <div className="opis-collapse-container">
                        <span
                          className={
                            "opis-collapse-indicator " +
                            (s.dodatni_opis && s.dodatni_opis.trim() !== "" ? "green" : "red")
                          }
                          title={
                            s.dodatni_opis && s.dodatni_opis.trim() !== ""
                              ? "Opis postoji"
                              : "Opis prazan"
                          }
                        />
                        <button
                          className="opis-collapse-toggle"
                          type="button"
                          onClick={() => setOpenOpisIndex(openOpisIndex === i ? null : i)}
                          tabIndex={0}
                          aria-label="Prikaži/sakrij opis"
                        >
                          Opis
                          <span
                            className={"opis-collapse-arrow" + (openOpisIndex === i ? " open" : "")}
                          >
                            ▶
                          </span>
                        </button>
                        <div
                          style={{
                            maxHeight: openOpisIndex === i ? 400 : 0,
                            transition: "max-height 0.35s cubic-bezier(.42,1.05,.69,1.11)",
                            overflow: "hidden",
                            flex: 1,
                            display: openOpisIndex === i ? "block" : "none",
                          }}
                        >
                          <textarea
                            className="opis-collapse-field"
                            placeholder="Opis stavke (opcionalno)"
                            value={s.dodatni_opis || ""}
                            onChange={(e) => updateStavka(i, "dodatni_opis", e.target.value)}
                            rows={openOpisIndex === i ? 5 : 1}
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>

      <div className="invoice-summary">
        Ukupno: {form.ukupno.toFixed(2)} | PDV ukupno: {form.ukupno_pdv.toFixed(2)} | Bruto ukupno:{" "}
        {(form.ukupno + form.ukupno_pdv).toFixed(2)}
      </div>

      <div style={{ textAlign: "center", marginTop: "2.2rem" }}>
        <button type="submit" className="btn btn-success" disabled={saving}>
          {saving ? "Spremam..." : "Spremi"}
        </button>
      </div>
    </form>
  );
}
