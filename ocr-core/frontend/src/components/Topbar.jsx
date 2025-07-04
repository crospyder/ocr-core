// src/components/Topbar.jsx

import React from "react";

export default function Topbar() {
  return (
    <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center border-b">
      <div>
        <h1 className="text-xl font-semibold text-blue-800">OCR Sustav</h1>
      </div>
      <div className="text-sm text-gray-600">Dobrodošli, korisniče</div>
    </header>
  );
}
