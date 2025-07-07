import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AnimatedBreadcrumbs() {
  const location = useLocation();
  const { pathname } = location;

  if (pathname === "/") return null;
  const pathnames = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="breadcrumb" className="d-flex align-items-center my-3">
      <Link to="/" className="breadcrumb-item animated-breadcrumb" style={{ animationDelay: `0s` }}>
        Početna
      </Link>

      {pathnames.map((segment, idx) => {
        const to = "/" + pathnames.slice(0, idx + 1).join("/");
        const isLast = idx === pathnames.length - 1;
        const name = segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={to}>
            <span
              className="breadcrumb-separator animated-breadcrumb"
              style={{ animationDelay: `${(idx + 0.5) * 0.1}s` }}
            >
              &gt;
            </span>
            {isLast ? (
              <span
                className="breadcrumb-item active animated-breadcrumb"
                aria-current="page"
                style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
              >
                {name}
              </span>
            ) : (
              <Link
                to={to}
                className="breadcrumb-item animated-breadcrumb"
                style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
              >
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
