import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Breadcrumbs from "./Breadcrumbs.jsx";

export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ height: "100vh" }}>
      {/* Sticky Topbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 1030 }}>
        <Topbar />
      </div>

      {/* Glavni sadržaj ispod topbara, flex raspored */}
      <div className="d-flex flex-grow-1" style={{ height: "calc(100vh - 70px)", overflow: "hidden" }}>
        <Sidebar />

        <main
          className="flex-grow-1 p-4 overflow-auto d-flex flex-column"
          style={{ width: "100%", overflowX: "hidden" }}
        >
          <Breadcrumbs />
          <div className="flex-grow-1 mt-3">
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
