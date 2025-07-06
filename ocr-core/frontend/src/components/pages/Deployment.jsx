import React from "react";
import ClientUpload from "../Deployment/ClientUpload";
import ClientInfoView from "../Deployment/ClientInfoView";

export default function Deployment() {
  return (
    <div>
      <h2 className="mb-4">Deployment konfiguracija</h2>
      <ClientUpload />
      <ClientInfoView />
    </div>
  );
}
