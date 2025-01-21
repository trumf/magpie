import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    const swUrl = process.env.PUBLIC_URL + "/sw.js";
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log("ServiceWorker registration successful:", registration);
      })
      .catch((error) => {
        console.error("ServiceWorker registration failed:", error);
      });
  });
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
