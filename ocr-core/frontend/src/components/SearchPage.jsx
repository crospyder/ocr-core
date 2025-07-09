import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";  // Za obavijesti

const SearchPage = () => {
  const [query, setQuery] = useState("");        // Pohranjivanje unosa za pretragu
  const [results, setResults] = useState({ db_results: [], es_results: [] }); // Pohranjivanje rezultata pretrage
  const [loading, setLoading] = useState(false); // Praćenje statusa pretrage

  // Funkcija koja poziva API za pretragu
  const handleSearch = async () => {
    if (!query.trim()) {
      toast.warning("Molimo unesite pojam za pretragu!");
      return; // Ako je upit prazan, ne šaljemo pretragu
    }

    setLoading(true); // Početak pretrage
    try {
      const response = await axios.get("http://localhost:8000/api/search/", {
        params: { query }
      });

      const { db_results, es_results } = response.data;

      // Provjera rezultata pretrage
      if (db_results.length === 0 && es_results.length === 0) {
        toast.info("Nema rezultata za pretragu.");
      } else {
        toast.success(`Pronađeno ${db_results.length + es_results.length} rezultata.`);
      }

      setResults({ db_results, es_results }); // Pohranjivanje rezultata
    } catch (error) {
      console.error("Error fetching search results:", error);
      toast.error("Došlo je do pogreške prilikom pretrage.");
    } finally {
      setLoading(false); // Završetak pretrage
    }
  };

  return (
    <div className="container py-4">
      <h2>Pretraži dokumente</h2>

      {/* Input za unos pretrage */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Unesite pojam za pretragu"
        className="form-control mb-2"
      />

      {/* Dugme za pokretanje pretrage */}
      <button onClick={handleSearch} disabled={loading} className="btn btn-primary">
        {loading ? "Pretraga..." : "Pretraži"}
      </button>

      {/* Prikazivanje rezultata pretrage */}
      {results.db_results.length > 0 && (
        <div className="mt-4">
          <h3>Rezultati iz baze podataka:</h3>
          <ul className="list-group">
            {results.db_results.map((result, index) => (
              <li key={index} className="list-group-item">
                <strong>{result.title}</strong>
                <br />
                <em>{result.content}</em>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.es_results.length > 0 && (
        <div className="mt-4">
          <h3>Rezultati iz dokumenta:</h3>
          <ul className="list-group">
            {results.es_results.map((result, index) => (
              <li key={index} className="list-group-item">
                <strong>{result._source.ocr_text.substring(0, 100)}...</strong>
                <br />
                <em>Dokument ID: {result._id}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchPage;  // Default export
