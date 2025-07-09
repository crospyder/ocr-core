import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Breadcrumbs from "./Breadcrumbs.jsx";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname.split("/")[1] || "početna";

  const pathTitles = {
    upload: "Upload",
    documents: "Dokumenti",
    partneri: "Partneri",
    admin: "Admin Panel",
    deployment: "Deployment",
  };

  const pageTitle = (pathTitles[currentPath] || currentPath).toUpperCase();

  const showBackButton = location.pathname !== "/";

  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ height: "100vh" }}>
      {/* Sticky Topbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 1030 }}>
        <Topbar />
      </div>

      {/* Glavni sadržaj ispod topbara */}
      <div className="d-flex flex-grow-1" style={{ height: "calc(100vh - 70px)", overflow: "hidden" }}>
        <Sidebar />

        <main className="flex-grow-1 overflow-auto d-flex flex-column" style={{ width: "100%", overflowX: "hidden" }}>
          {/* Breadcrumb + naslov stranice + gumb Natrag */}
          <div className="px-4 py-3" style={{ backgroundColor: "#212429", color: "white" }}>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h1 className="h5 m-0">{pageTitle}</h1>
              {showBackButton && (
                <button onClick={() => navigate(-1)} className="btn btn-sm btn-outline-light">
                  ⬅ NATRAG
                </button>
              )}
            </div>
            <Breadcrumbs />
          </div>

          {/* Sadržaj stranice */}
          <div className="flex-grow-1 mt-3 px-4 pb-4">
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
