import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import AdminBar from "./AdminBar.jsx";  // import AdminBar
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
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ height: "100vh" }}>
      {/* AdminBar na vrhu */}
      {isAdmin && <AdminBar />}

      <div style={{ position: "sticky", top: 0, zIndex: 1030 }}>
        <Topbar />
      </div>

      <div className="d-flex flex-grow-1" style={{ height: "calc(100vh - 100px)", overflow: "hidden" }}>
        <Sidebar />

        <main
          className="flex-grow-1 overflow-auto d-flex flex-column"
          style={{ width: "100%", overflowX: "hidden" }}
        >
          <div
            className="page-header d-flex align-items-center gap-2 px-4"
            style={{ background: "#232d39", color: "white", borderRadius: 0, minHeight: "54px", fontWeight: 400 }}
          >
            <nav aria-label="breadcrumb" className="d-flex align-items-center flex-wrap" style={{ flex: 1 }}>
              {breadcrumbs.map((bc, idx) => (
                <span key={bc.to} className="d-flex align-items-center">
                  {idx !== 0 && <span className="mx-2" style={{ color: "#ffd600" }}>/</span>}
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="breadcrumb-item active" style={{ color: "#fff", opacity: 0.77 }}>
                      {bc.name}
                    </span>
                  ) : (
                    <Link
                      to={bc.to}
                      className="breadcrumb-item"
                      style={{ color: "#ffd600", textDecoration: "none", fontWeight: 500 }}
                    >
                      {bc.name}
                    </Link>
                  )}
                </span>
              ))}
            </nav>

            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="pantheon-back-btn ms-3"
                style={{
                  background: "#ffd600",
                  color: "#232d39",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: "none",
                  padding: "6px 26px",
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

          <div className="flex-grow-1 px-4 pb-4">
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
