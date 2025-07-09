import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import RecentDocuments from "./RecentDocuments";
import DocumentStats from "./DocumentStats";

const Dashboard = () => {
  return (
    <Container fluid className="dashboard-container mt-4">
      <h2 className="h4 text-primary mb-4">📊 Dashboard</h2>

      <Row className="g-4 mt-3">
        <Col xs={12} md={6} lg={6}>
          <RecentDocuments />
        </Col>
        <Col xs={12} md={6} lg={6}>
          <DocumentStats />
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
