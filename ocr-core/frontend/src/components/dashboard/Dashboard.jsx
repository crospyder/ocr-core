import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import RecentDocuments from "./RecentDocuments";
import DocumentStats from "./DocumentStats";
import TopPartners from "./TopPartners";

const Dashboard = () => {
  return (
    <Container fluid className="dashboard-container mt-4">
      <h2 className="h4 text-primary mb-4">📊 Dashboard</h2>

      <Row className="g-4 mt-3">
        <Col xs={12} md={6} lg={4}>
          <RecentDocuments />
        </Col>
        <Col xs={12} md={6} lg={4}>
          <DocumentStats />
        </Col>
        <Col xs={12} md={12} lg={4}>
          <TopPartners />
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
