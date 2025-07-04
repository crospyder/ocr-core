import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';

import App from "./src/App.jsx";
import Upload from "./src/components/pages/Upload.jsx";
import Documents from "./src/components/pages/Documents.jsx";
import DocumentDetail from "./src/components/DocumentDetail.jsx"; // Nova komponenta za detalje dokumenta
import AdminPanel from "./src/components/AdminPanel.jsx";

import "./main.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // Tvoj Layout s Sidebar, Topbar itd.
    children: [
      { path: "upload", element: <Upload /> },
      { path: "documents", element: <Documents /> },
      { path: "documents/:id", element: <DocumentDetail /> }, // Detalji pojedinog dokumenta
      { path: "admin", element: <AdminPanel /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
