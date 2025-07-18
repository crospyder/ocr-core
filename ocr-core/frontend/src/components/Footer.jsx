import React, { useEffect, useState } from "react";

export default function Footer() {
  const [version, setVersion] = useState("v0.0.0");
  const [buildDate, setBuildDate] = useState("Nepoznato");

  useEffect(() => {
    fetch("/core/version.json")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        setVersion(data.verzija || "v0.0.0");
        setBuildDate(data.zadnje_azuriranje || "Nepoznato");
      })
      .catch(() => {
        setVersion("v0.0.0");
        setBuildDate("Nepoznato");
      });
  }, []);

  return (
    <footer className="footer">
      <div>
        © 2025{" "}
        <a
          href="https://spine-ict.hr"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Spine ICT Solutions d.o.o.
        </a>
        {" "} Sva prava pridržana.
      </div>
      <div>
        Verzija: <strong>{version}</strong>
        {" · "}
        Ažurirano: {buildDate}
      </div>
    </footer>
  );
}
