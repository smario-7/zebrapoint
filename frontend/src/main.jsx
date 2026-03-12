import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: "12px",
          background: "#1e293b",
          color: "#f8fafc",
          fontSize: "14px",
          padding: "12px 16px"
        },
        success: {
          iconTheme: { primary: "#0d9488", secondary: "#f8fafc" }
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#f8fafc" }
        }
      }}
    />
  </StrictMode>
);
