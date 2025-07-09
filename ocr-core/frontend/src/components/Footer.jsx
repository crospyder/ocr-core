// src/components/Footer.jsx

import React, { useEffect, useState } from "react";

export default function Footer() {
  const [version, setVersion] = useState("v0.0.0");
  const [buildDate, setBuildDate] = useState("Nepoznato");

  useEffect(() => {
    fetch("/core/version.json") // koristi mountano preko FastAPI: app.mount("/core", ...)
      .then((res) => res.json())
      .then((data) => {
        setVersion(data.version || "v0.0.0");
        setBuildDate(data.updated_at || "Nepoznato"); // <- ispravljen ključ
      })
      .catch(() => {
        setVersion("v0.0.0");
        setBuildDate("Nepoznato");
      });
  }, []);

  return (
    <footer
      className="d-flex justify-content-between align-items-center px-4 py-3 mt-auto"
      style={{
        backgroundColor: "#212429",
        color: "#adb5bd",
        fontSize: "0.875rem",
        borderTop: "1px solid #2c2f33",
      }}
    >
      <div>
        © 2025{" "}
        <a
          href="https://spine-ict.hr"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#ffffff", textDecoration: "underline" }}
        >
          Spine ICT Solutions d.o.o.
        </a>{" "}
        Sva prava pridržana.
      </div>

      <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#6c757d" }}>
        Verzija aplikacije: <strong>{version}</strong>
        <br />
        Zadnje ažuriranje: {buildDate}
      </div>
    </footer>
  );
}
