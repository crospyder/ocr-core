import React from "react";
import { Viewer } from "@react-pdf-viewer/core"; 
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

// Import pdfjs worker
import { GlobalWorkerOptions } from "pdfjs-dist/build/pdf";

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Postavi workerSrc na pdfjs-dist path (Vite podržava import.meta.url)
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

export default function PdfViewer({ fileUrl }) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  return (
    <div style={{ height: "750px", border: "1px solid rgba(0, 0, 0, 0.3)" }}>
      <Viewer 
        fileUrl={fileUrl} 
        plugins={[defaultLayoutPluginInstance]} 
        defaultScale={1} // 100% zoom
      />
    </div>
  );
}
