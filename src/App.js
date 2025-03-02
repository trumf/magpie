// App.js - Enhanced with better PWA support
import "./styles/reset.css"; // 1. Browser reset styles first
import "./styles/themes.css"; // 2. Theme variables second
import "./styles/global.css"; // 3. Global styles that use theme variables
import React, {useState, useEffect} from "react";
import {AppProvider} from "./contexts/AppContext";
import Reader from "./components/reader/Reader";

// Service Worker Registration
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log(
        "Service Worker registered successfully:",
        registration.scope
      );

      // Request permission for notifications
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        console.log("Notification permission:", permission);
      }

      // Register for periodic background sync if supported
      if ("periodicSync" in registration) {
        try {
          const status = await navigator.permissions.query({
            name: "periodic-background-sync",
          });

          if (status.state === "granted") {
            // Register for periodic sync every 24 hours
            await registration.periodicSync.register("refresh-content", {
              minInterval: 24 * 60 * 60 * 1000, // 24 hours
            });
            console.log("Periodic background sync registered");
          }
        } catch (error) {
          console.error("Error registering periodic sync:", error);
        }
      }

      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }
  return null;
};

// Component to handle service worker updates
const ServiceWorkerUpdater = ({registration}) => {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if (!registration) return;

    // Initial check for a waiting worker
    if (registration.waiting) {
      setWaitingWorker(registration.waiting);
      setShowReload(true);
    }

    // Add listener for new service workers
    const handleUpdate = () => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowReload(true);
      }
    };

    // Listen for new service workers
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setWaitingWorker(newWorker);
          setShowReload(true);
        }
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (waitingWorker) {
        window.location.reload();
      }
    });

    return () => {
      // Clean up listeners if needed
    };
  }, [registration, waitingWorker]);

  const reloadPage = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({type: "skipWaiting"});
    } else {
      window.location.reload();
    }
  };

  if (!showReload) return null;

  return (
    <div className="update-toast">
      <div className="update-toast-content">
        <p>New version available!</p>
        <button onClick={reloadPage}>Update</button>
      </div>
    </div>
  );
};

// Handle URL query parameters
const processQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    importMode: params.get("import") === "true",
    viewMode: params.get("view") || "default",
  };
};

const App = () => {
  const [swRegistration, setSwRegistration] = useState(null);
  const [queryParams, setQueryParams] = useState(processQueryParams());

  // Register service worker when component mounts
  useEffect(() => {
    const initServiceWorker = async () => {
      const registration = await registerServiceWorker();
      setSwRegistration(registration);
    };

    initServiceWorker();

    // Handle URL parameter changes
    const handlePopState = () => {
      setQueryParams(processQueryParams());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Add web app manifest link if it doesn't exist
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "/manifest.json";
      document.head.appendChild(link);
    }
  }, []);

  // App's initial state can be influenced by URL parameters
  const appContextValue = {
    initialImportMode: queryParams.importMode,
    initialViewMode: queryParams.viewMode,
  };

  return (
    <AppProvider initialState={appContextValue}>
      <Reader />
      <ServiceWorkerUpdater registration={swRegistration} />
    </AppProvider>
  );
};

export default App;
