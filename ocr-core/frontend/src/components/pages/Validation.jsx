import React, { useState } from "react";
import { toast } from "react-toastify";

export default function Validation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleValidate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/documents/validation/validate-classify", { method: "POST" });
      if (!res.ok) throw new Error("Greška u pozivu API-ja.");
      const data = await res.json();
      setResult(data.message);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mt-4">
      <h3>Validacija i klasifikacija dokumenata</h3>
      <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
        {loading ? "Obrada..." : "Pokreni validaciju i klasifikaciju"}
      </button>
      {result && <p className="mt-3">{result}</p>}
    </div>
  );
}
