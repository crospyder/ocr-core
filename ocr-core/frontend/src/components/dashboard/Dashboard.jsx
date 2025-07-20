import React from "react";
import RecentDocuments from "./RecentDocuments";
import DocumentStats from "./DocumentStats";
import TopPartners from "./TopPartners";
import CollapsibleSection from "./CollapsibleSection";

export default function Dashboard() {
  return (
    <div className="dashboard-container" style={{ marginTop: "2rem" }}>
      <h2 className="page-title mb-4" style={{ color: "#232d39" }}>
        Dashboard
      </h2>
      <div className="dashboard-grid">
        <CollapsibleSection title="Najnoviji dokumenti" defaultExpanded={true}>
          <RecentDocuments />
        </CollapsibleSection>
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
