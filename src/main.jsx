import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import "./styles/index.css";

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("App ready for offline use");
  },
  onNeedRefresh() {
    console.log("New content available, refresh recommended");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);