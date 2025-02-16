// App.js
import React from "react";
import {AppProvider} from "./contexts/AppContext";
import Reader from "./components/reader/Reader";
import "./styles/main.css";

// Service Worker Registration
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Add a custom reload prompt when a new service worker is waiting
      if (registration.waiting) {
        // New content is available, let's reload...
        if (window.confirm("New version available! Click OK to update.")) {
          registration.waiting.postMessage({type: "SKIP_WAITING"});
        }
      }

      // Handler for new service workers
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New content is available, let's reload...
            if (window.confirm("New version available! Click OK to update.")) {
              newWorker.postMessage({type: "SKIP_WAITING"});
            }
          }
        });
      });

      // Reload when the new Service Worker takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });

      console.log(
        "Service Worker registered successfully:",
        registration.scope
      );
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }
};

const App = () => {
  // Register service worker when component mounts
  React.useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <AppProvider>
      <Reader />
    </AppProvider>
  );
};

export default App;
