import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "./config/AppProviders.jsx";
import App from "./App.jsx";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
