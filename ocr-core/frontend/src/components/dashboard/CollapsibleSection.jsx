import React, { useState, useRef, useEffect } from "react";

export default function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState("auto");

  const toggleOpen = () => {
    if (isOpen) {
      // collapse - animiraj visinu na 0
      setHeight(`${contentRef.current.scrollHeight}px`); // prvo postavi visinu da je trenutna (za animaciju)
      requestAnimationFrame(() => setHeight("0px")); // pa onda na 0 da se animira
    } else {
      // expand - animiraj visinu na scrollHeight
      setHeight(`${contentRef.current.scrollHeight}px`);
    }
    setIsOpen(!isOpen);
  };

  // Kada je expand završio, postavi height na auto da bi sadržaj mogao slobodno rasti
  const onTransitionEnd = () => {
    if (isOpen) {
      setHeight("auto");
    }
  };

  return (
    <section className="dashboard-col card p-3" style={{ cursor: "default" }}>
      <header
        onClick={toggleOpen}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          marginBottom: isOpen ? "1rem" : "0",
        }}
      >
        <h5 className="page-title mb-0" style={{ fontWeight: "600", color: "#232d39" }}>
          {title}
        </h5>
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.3s ease",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            fontSize: "1.2rem",
            lineHeight: 1,
            color: "#232d39",
            userSelect: "none",
          }}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
        >
          ▶
        </span>
      </header>
      <div
        ref={contentRef}
        style={{
          height: height,
          overflow: "hidden",
          transition: "height 0.3s ease",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
      </div>
    </section>
  );
}
