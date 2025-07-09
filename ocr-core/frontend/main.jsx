import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Deployment from "./src/components/pages/Deployment.jsx";
import App from "./src/App.jsx";
import Upload from "./src/components/pages/Upload.jsx";
import Documents from "./src/components/pages/Documents.jsx";
import DocumentDetail from "./src/components/DocumentDetail.jsx";
import AdminPanel from "./src/components/AdminPanel.jsx";
import Dashboard from "./src/components/dashboard/Dashboard.jsx"; // import dashboard
import "./main.css";
import PartnerDocuments from "./src/components/pages/PartnerDocuments.jsx";
import Partneri from "./src/components/pages/Partneri.jsx";


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // Tvoj Layout s Sidebar, Topbar itd.
    children: [
      { index: true, element: <Dashboard /> },
      { path: "upload", element: <Upload /> },
      { path: "documents", element: <Documents /> },
      { path: "documents/:id", element: <DocumentDetail /> }, // Detalji pojedinog dokumenta
      { path: "admin", element: <AdminPanel /> },
      { path: "deployment", element: <Deployment /> }, // ➕ OVA LINIJA
      { path: "documents/partner/:oib", element: <PartnerDocuments /> },
      { path: "partneri", element: <Partneri /> },

    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
