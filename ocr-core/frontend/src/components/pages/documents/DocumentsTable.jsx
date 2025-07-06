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

        // Pretpostavimo da su datumi u ISO formatu pa ih možemo uspoređivati kao stringove
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
    <table className="table table-striped table-hover">
      <thead>
        <tr>
          <th onClick={() => requestSort("name")}>Naziv dokumenta</th>
          <th onClick={() => requestSort("date")}>Datum</th>
          <th onClick={() => requestSort("supplier")}>Dobavljač</th>
          <th onClick={() => requestSort("due_date")}>Datum valute</th>
          <th onClick={() => requestSort("amount")}>Iznos</th>
          <th>Status obrade</th>
        </tr>
      </thead>
      <tbody>
        {sortedDocs.map((doc) => (
          <tr key={doc.id}>
            <td><a href={`/documents/${doc.id}`}>{doc.name}</a></td>
            <td>{doc.date}</td>
            <td>{doc.supplier}</td>
            <td>{doc.due_date}</td>
            <td>{doc.amount.toFixed(2)} kn</td>
            <td>{doc.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DocumentsTable;
