import React, { useEffect, useState } from "react";

const DocumentsTable = ({ documents }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [sortedDocs, setSortedDocs] = useState(documents);

  useEffect(() => {
    let sortableDocs = [...documents];
    if (sortConfig.key) {
      sortableDocs.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Ako su stringovi, usporedi kao stringove, ako su brojevi kao brojeve
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

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
          <th onClick={() => requestSort("name")} style={{cursor: "pointer"}}>Naziv dokumenta</th>
          <th onClick={() => requestSort("date")} style={{cursor: "pointer"}}>Datum</th>
          <th onClick={() => requestSort("supplier")} style={{cursor: "pointer"}}>Dobavljač</th>
          <th onClick={() => requestSort("due_date")} style={{cursor: "pointer"}}>Datum valute</th>
          <th onClick={() => requestSort("amount")} style={{cursor: "pointer"}}>Iznos</th>
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
