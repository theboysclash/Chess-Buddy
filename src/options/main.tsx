import React from "react";
import ReactDOM from "react-dom/client";
import "../styles/globals.css";
import { SettingsPage } from "./Settings";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsPage />
  </React.StrictMode>,
);
