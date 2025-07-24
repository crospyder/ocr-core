// #DocumentsTable.jsx
import React, { useState, useEffect } from "react";

const DocumentsTable = ({ documents }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [sortedDocs, setSortedDocs] = useState(documents);

  useEffect(() => {
    let sortableDocs = [...documents];
    if (sortConfig.key) {
      sortableDocs.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Datumi i brojevi neka rade kao string/number
        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    setSortedDocs(sortableDocs);
  }, [documents, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="table-responsive">
      <table className="table table-custom table-hover w-100">
        <thead>
          <tr>
            <th onClick={() => requestSort("name")} style={{ cursor: "pointer" }}>Naziv dokumenta</th>
            <th onClick={() => requestSort("date")} style={{ cursor: "pointer" }}>Datum</th>
            <th onClick={() => requestSort("supplier")} style={{ cursor: "pointer" }}>Dobavljač</th>
            <th onClick={() => requestSort("due_date")} style={{ cursor: "pointer" }}>Datum valute</th>
            <th onClick={() => requestSort("amount")} style={{ cursor: "pointer" }}>Iznos</th>
            <th>Status obrade</th>
          </tr>
        </thead>
        <tbody>
          {sortedDocs.map((doc) => (
            <tr key={doc.id}>
              <td>
                <a href={`/documents/${doc.id}`} className="fw-bold" style={{ color: "#1976d2" }}>
                  {doc.name}
                </a>
              </td>
              <td>{doc.date}</td>
              <td>{doc.supplier}</td>
              <td>{doc.due_date}</td>
              <td>{doc.amount.toFixed(2)} kn</td>
              <td>{doc.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentsTable;
