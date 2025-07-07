// src/components/dashboard/StatsCard.jsx
import React from "react";
import { Card } from "react-bootstrap";

const StatsCard = ({ title, value, icon }) => {
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex align-items-center">
          <i className={`${icon} fs-3 me-3 text-primary`}></i>
          <div>
            <div className="text-muted small">{title}</div>
            <div className="h5 mb-0 fw-bold">{value}</div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default StatsCard;