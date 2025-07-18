import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import Footer from "./Footer.jsx";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light" style={{ height: "100vh" }}>
      <Topbar />
      <div className="d-flex flex-grow-1" style={{ height: "calc(100vh - 56px)" }}>
        <Sidebar />
        <main className="flex-grow-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
