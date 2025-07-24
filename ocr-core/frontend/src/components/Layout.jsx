// #layout.jsx
import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import AdminBar from "./AdminBar.jsx";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const pathTitles = {
  upload: "Upload",
  documents: "Dokumenti",
  partneri: "Partneri",
  admin: "Admin Panel",
  deployment: "Deployment",
  search: "Pretraga",
};

function buildBreadcrumbs(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  return [
    { name: "Početna", to: "/" },
    ...segments.map((seg, i) => ({
      name: pathTitles[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      to: "/" + segments.slice(0, i + 1).join("/"),
    })),
  ];
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { pathname } = location;
  const currentPath = pathname.split("/")[1] || "";
  const pageTitle =
    pathTitles[currentPath] ||
    (currentPath ? currentPath.charAt(0).toUpperCase() + currentPath.slice(1) : "Početna");

  const showBackButton = pathname !== "/";
  const breadcrumbs = buildBreadcrumbs(pathname);

  const isAdmin = true; // replace with real auth check

  return (
    <div className="layout-container">
      {isAdmin && <AdminBar />}

      <div className="topbar-sticky">
        <Topbar breadcrumbs={breadcrumbs} />
      </div>

      <div className="layout-content">
        <Sidebar />

        <main className="main-content">
          {/* ukloni breadcrumbs iz layouta jer su u topbaru sada */}
          <div className="page-header d-flex align-center gap-2">
            <h1 className="page-title">{pageTitle}</h1>
            
          </div>

          <div className="flex-grow-1" style={{ minHeight: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>

      <Footer />

      <ToastContainer
        position="top-right"
        autoClose={8000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
