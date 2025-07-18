import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import AdminBar from "./AdminBar.jsx";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Mapiranje ruta na naslove
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
  const breadcrumbs = [
    { name: "Početna", to: "/" },
    ...segments.map((seg, i) => ({
      name: pathTitles[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      to: "/" + segments.slice(0, i + 1).join("/"),
    })),
  ];
  return breadcrumbs;
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

  // TODO: Zamijeni sa stvarnom logikom za provjeru je li admin
  const isAdmin = true;  // ili dohvati iz auth konteksta

  return (
    <div className="layout-container">
      {isAdmin && <AdminBar />}

      {/* Sticky Topbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 1030 }}>
        <Topbar />
      </div>

      {/* Glavni sadržaj */}
      <div className="layout-content">
        <Sidebar />

        {/* Koristim container-fluid i uklonio sam dodatne margine/paddinge */}
        <main className="container-fluid m-0" style={{ flexGrow: 1 }}>
          {/* Page header s breadcrumbs */}
          <div className="page-header d-flex align-items-center gap-2">
            <nav
              aria-label="breadcrumb"
              className="d-flex align-items-center flex-wrap breadcrumbs-row"
              style={{ flex: 1 }}
            >
              {breadcrumbs.map((bc, idx) => (
                <span key={bc.to} className="d-flex align-items-center">
                  {idx !== 0 && (
                    <span className="breadcrumb-separator">/</span>
                  )}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="breadcrumb-item active">{bc.name}</span>
                  ) : (
                    <Link to={bc.to} className="breadcrumb-item">
                      {bc.name}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="back-btn ms-3"
                style={{
                  background: "#ffd600",
                  color: "#232d39",
                  fontWeight: 600,
                  border: "none",
                  padding: "6px 6px",
                  minWidth: 95,
                  fontSize: "1rem",
                  boxShadow: "0 2px 6px 0 rgba(33,45,57,0.07)",
                  transition: "background 0.15s",
                }}
              >
                &#8592; Natrag
              </button>
            )}
          </div>

          {/* Uklonio paddinge, ostavio samo fleks rastezanje */}
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
