import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <Topbar />
      <div className="d-flex flex-grow-1 container-fluid px-0">
        <Sidebar />
        <main className="flex-grow-1 p-4 overflow-auto">
          <Outlet /> {/* Tu se prikazuju podstranice */}
        </main>
      </div>
      <Footer />
      <ToastContainer
        position="top-right"
        autoClose={4000}
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
