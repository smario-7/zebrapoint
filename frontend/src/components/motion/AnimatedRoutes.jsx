import { AnimatePresence } from "framer-motion";
import { Routes, useLocation } from "react-router-dom";

export default function AnimatedRoutes({ children }) {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-[var(--zp-app-bg)]">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {children}
        </Routes>
      </AnimatePresence>
    </div>
  );
}

