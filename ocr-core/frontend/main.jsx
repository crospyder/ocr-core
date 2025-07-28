// #main.jsx

import axios from "axios";

axios.defaults.baseURL = "http://10.0.1.252:8000";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Deployment from "./src/components/Deployment/Deployment.jsx";
import App from "./src/App.jsx";
import Upload from "./src/components/pages/Upload.jsx";
import Documents from "./src/components/pages/Documents.jsx";
import DocumentDetail from "./src/components/DocumentDetail.jsx";
import AdminPanel from "./src/components/AdminPanel.jsx";
import Dashboard from "./src/components/dashboard/Dashboard.jsx";
import PartnerDocuments from "./src/components/pages/PartnerDocuments.jsx";
import Partneri from "./src/components/pages/Partneri.jsx";
import SearchPage from "./src/components/SearchPage";
import SudReg_Manual from "./src/components/SudReg_Manual.jsx";
import MailClients from "./src/components/mail-client.jsx";
import Settings from "./src/components/pages/Settings.jsx";


import BillingRouter from "./billing/router.jsx";

import "./main.css"; // Custom CSS, Bootstrap maknut

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "upload", element: <Upload /> },
      { path: "documents", element: <Documents /> },
      { path: "documents/:id", element: <DocumentDetail /> },
      { path: "admin", element: <AdminPanel /> },
      { path: "deployment", element: <Deployment /> },
      { path: "documents/partner/:oib", element: <PartnerDocuments /> },
      { path: "partneri", element: <Partneri /> },
      { path: "search", element: <SearchPage /> },
      { path: "tools/manual-sudreg", element: <SudReg_Manual /> },
      { path: "mail_clients", element: <MailClients /> },
      { path: "billing/*", element: <BillingRouter /> },  // <-- billing ruta dodana
      { path: "settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
