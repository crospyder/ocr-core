// src/components/dashboard/Dashboard.jsx
import React from "react";
import StatsCard from "./StatsCard";
import BarChart from "./BarChart";
import RecentActivity from "./RecentActivity";
import { Container, Row, Col } from "react-bootstrap";

const Dashboard = () => {
  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col md={3}>
          <StatsCard title="Ukupno dokumenata" value="124" icon="bi bi-file-earmark-text" />
        </Col>
        <Col md={3}>
          <StatsCard title="Obrađeni dokumenti" value="98" icon="bi bi-check-circle" />
        </Col>
        <Col md={3}>
          <StatsCard title="Novi dobavljači" value="5" icon="bi bi-person-plus" />
        </Col>
        <Col md={3}>
          <StatsCard title="Slobodan prostor" value="1.2 GB" icon="bi bi-hdd" />
        </Col>
      </Row>

      <Row>
        <Col md={8}>
          <BarChart />
        </Col>
        <Col md={4}>
          <RecentActivity />
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;