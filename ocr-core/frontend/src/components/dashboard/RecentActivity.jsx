// src/components/dashboard/RecentActivity.jsx
import React from "react";
import { Card, ListGroup } from "react-bootstrap";

const RecentActivity = () => {
  const activities = [
    { icon: "bi bi-upload", text: "Upload: faktura_001.pdf" },
    { icon: "bi bi-person-check", text: "Novi dobavljač: Elgrad d.o.o." },
    { icon: "bi bi-check2-square", text: "Dokument obrađen: IRA_2025_07.pdf" },
  ];

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title>Posljednje aktivnosti</Card.Title>
        <ListGroup variant="flush">
          {activities.map((a, i) => (
            <ListGroup.Item key={i} className="d-flex align-items-center">
              <i className={`${a.icon} me-3 text-secondary`}></i>
              {a.text}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default RecentActivity;
