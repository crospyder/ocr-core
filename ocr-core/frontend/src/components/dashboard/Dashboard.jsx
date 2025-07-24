import React from "react";
import RecentDocuments from "./RecentDocuments";
import DocumentStats from "./DocumentStats";
import TopPartners from "./TopPartners";
import CollapsibleSection from "./CollapsibleSection";

export default function Dashboard() {
  return (
    <div className="container mt-2 mb-2">
      <h2 className="page-title mb-4">Statistika i analitika </h2>
      <div className="dashboard-grid">
        <CollapsibleSection
          title="Najnoviji dokumenti"
          defaultExpanded={true}
          cardClass="dashboard-card"
          headerClass="custom-collapsible-header"
        >
          <RecentDocuments />
        </CollapsibleSection>
        <CollapsibleSection
          title="Statistika dokumenata i diska"
          defaultExpanded={true}
          cardClass="dashboard-card"
          headerClass="custom-collapsible-header"
        >
          <DocumentStats />
        </CollapsibleSection>
        <CollapsibleSection
          title="Top partneri po broju dokumenata"
          defaultExpanded={true}
          cardClass="dashboard-card"
          headerClass="custom-collapsible-header"
        >
          <TopPartners />
        </CollapsibleSection>
      </div>
    </div>
  );
}
