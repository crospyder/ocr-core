import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ db_results: [], es_results: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.warning("Molimo unesite pojam za pretragu!");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/search/", {
        params: { query }
      });
      const { db_results, es_results } = response.data;
      if (db_results.length === 0 && es_results.length === 0) {
        toast.info("Nema rezultata za pretragu.");
      } else {
        toast.success(`Pronađeno ${db_results.length + es_results.length} rezultata.`);
      }
      setResults({ db_results, es_results });
    } catch (error) {
      console.error("Error fetching search results:", error);
      toast.error("Došlo je do pogreške prilikom pretrage.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleShowDocument = (id) => {
    navigate(`/documents/${id}`);
  };

  return (
    <div className="container py-4">
      <h2>Pretraži dokumente</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Unesite pojam za pretragu"
        className="form-control mb-2"
      />
      <button onClick={handleSearch} disabled={loading} className="btn btn-primary">
        {loading ? "Pretraga..." : "Pretraži"}
      </button>

      {results.db_results.length > 0 && (
        <div className="mt-4">
          <h3>Rezultati iz baze podataka:</h3>
          <ul className="list-group">
            {results.db_results.map((result, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>
                    {result.filename ? result.filename : "Nepoznat naziv datoteke"}
                  </strong>
                  <br />
                  <em>
                    {(result.ocrresult && result.ocrresult.substring(0, 180)) || ""}
                    {result.supplier_name_ocr ? (
                      <>
                        <br />
                        Dobavljač: {result.supplier_name_ocr}
                      </>
                    ) : null}
                  </em>
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleShowDocument(result.id)}
                  disabled={!result.id}
                  title="Prikaži dokument"
                >
                  Prikaži dokument
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.es_results.length > 0 && (
        <div className="mt-4">
          <h3>Rezultati iz Elasticsearch-a:</h3>
          <ul className="list-group">
            {results.es_results.map((result, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>
                    {result.filename ? result.filename : "Nepoznat naziv datoteke"}
                  </strong>
                  <br />
                  <em>
                    {(result.ocrresult && result.ocrresult.substring(0, 180)) || ""}
                    {result.supplier_name_ocr ? (
                      <>
                        <br />
                        Dobavljač: {result.supplier_name_ocr}
                      </>
                    ) : null}
                  </em>
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleShowDocument(result.id)}
                  disabled={!result.id}
                  title="Prikaži dokument"
                >
                  Prikaži dokument
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
