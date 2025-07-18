import React from "react";
import RecentDocuments from "./RecentDocuments";
import DocumentStats from "./DocumentStats";
import TopPartners from "./TopPartners";
<<<<<<< HEAD
=======
import CollapsibleSection from "./CollapsibleSection";
>>>>>>> 60dbd18 (Release verzija 0.5.0 - stabilna verzija mail_processing s rollbackom i zaštitom od duplikata)

export default function Dashboard() {
  return (
<<<<<<< HEAD
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
=======
    <div className="dashboard-container" style={{ marginTop: "2rem" }}>
      <h2 className="page-title mb-4" style={{ color: "#232d39" }}>
        Dashboard
      </h2>
      <div className="dashboard-grid">
        <CollapsibleSection title="Najnoviji dokumenti" defaultExpanded={true}>
          <RecentDocuments />
        </CollapsibleSection>
>>>>>>> 60dbd18 (Release verzija 0.5.0 - stabilna verzija mail_processing s rollbackom i zaštitom od duplikata)

        <CollapsibleSection title="Statistika dokumenata i diska" defaultExpanded={true}>
          <DocumentStats />
        </CollapsibleSection>

        <CollapsibleSection title="Top partneri po broju dokumenata" defaultExpanded={true}>
          <TopPartners />
        </CollapsibleSection>
      </div>
    </div>
  );
}
