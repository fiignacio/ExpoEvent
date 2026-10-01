import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Manejador de fallos en importación dinámica de Vite (cuando se despliega nueva versión)
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Módulo dinámico desactualizado detectado tras despliegue. Recargando...");
  event.preventDefault();
  window.location.reload();
});

window.addEventListener("error", (event) => {
  const msg = event.message || "";
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Expected a JavaScript-or-Wasm module script")
  ) {
    console.warn("Recargando la app para obtener la versión más reciente...");
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
