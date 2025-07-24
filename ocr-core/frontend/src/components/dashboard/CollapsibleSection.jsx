import React, { useState, useRef } from "react";

export default function CollapsibleSection({ title, children, defaultExpanded = true, cardClass = "", headerClass = "" }) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const contentRef = useRef(null);
  const [height, setHeight] = useState("auto");

  const toggleOpen = () => {
    if (isOpen) {
      setHeight(`${contentRef.current.scrollHeight}px`);
      requestAnimationFrame(() => setHeight("0px"));
    } else {
      setHeight(`${contentRef.current.scrollHeight}px`);
    }
    setIsOpen(!isOpen);
  };

  const onTransitionEnd = () => {
    if (isOpen) setHeight("auto");
  };

  return (
    <section className={`dashboard-col card p-4 ${cardClass}`} style={{ cursor: "default" }}>
      <header
        onClick={toggleOpen}
        className={`collapsible-header d-flex align-center justify-between ${isOpen ? "open" : ""} ${headerClass}`}
      >
        <h5 className="page-title mb-0 fw-bold collapsible-title">
          {title}
        </h5>
        <span
          className={`collapsible-icon ${isOpen ? "open" : ""}`}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
        >
          ▶
        </span>
      </header>
      <div
        ref={contentRef}
        className="collapsible-content"
        style={{ height: height }}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
      </div>
    </section>
  );
}
