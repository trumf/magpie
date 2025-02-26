// components/shared/ThemeToggle.jsx
import React, {useEffect, useState} from "react";
import {Moon, Sun} from "lucide-react";
import styles from "./ThemeToggle.module.css";

const ThemeToggle = () => {
  // Initialize theme based on user preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if user has already set a preference in localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    // Otherwise use system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply theme when component mounts or theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Also listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      // Only change if user hasn't manually set a preference
      if (!localStorage.getItem("theme")) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <button
      className={styles.toggle}
      onClick={() => setIsDarkMode(!isDarkMode)}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <Sun className={styles.icon} size={18} />
      ) : (
        <Moon className={styles.icon} size={18} />
      )}
    </button>
  );
};

export default ThemeToggle;
