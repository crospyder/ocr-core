import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ClientUpload() {
  const [fileName, setFileName] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/client/upload", formData);
      toast.success("Klijent uspješno uvezen!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Greška kod uploada");
    }
  };

  return (
    <div className="container mt-5">
      <h4>Uvoz klijenta (deployment)</h4>
      <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="form-control" />
      {fileName && <p className="text-muted">Odabrana datoteka: {fileName}</p>}
    </div>
  );
}
