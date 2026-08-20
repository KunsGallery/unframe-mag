import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import "./styles/index.css";

let updateSW = () => {};

updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("App ready for offline use");
  },
  onNeedRefresh() {
    console.log("New content available, refreshing app shell");
    updateSW(true);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
