import { Routes, useLocation } from "react-router-dom";

export default function AnimatedRoutes({ children }) {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-[var(--zp-app-bg)]">
      <Routes location={location}>{children}</Routes>
    </div>
  );
}

