import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import "@fontsource/balsamiq-sans/latin-400.css";
import "@fontsource/balsamiq-sans/latin-700.css";
import "@fontsource/balsamiq-sans/latin-ext-400.css";
import "@fontsource/balsamiq-sans/latin-ext-700.css";
import "../styles/index.css";
import { SoloApp } from "./SoloRoutes";
import { UpdateBanner } from "./UpdateBanner";

// Entry of the single-file build: the solo mode only, routed through the URL hash so it works from file://.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UpdateBanner />
    <HashRouter>
      <SoloApp />
    </HashRouter>
  </React.StrictMode>
);
