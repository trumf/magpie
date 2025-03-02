// components/reader/Header.jsx
import React from "react";
import {Menu, ChevronRight, ArrowLeft} from "lucide-react";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import ThemeToggle from "../shared/ThemeToggle";
import styles from "./Header.module.css";

const Header = () => {
  const {setIsSidebarVisible, isImporting, setIsImporting} = useApp();
  const {hasNext, navigateNext} = useFileNavigation();

  // If in importing mode, show a "Back to Library" button instead of the menu button
  const handleBackClick = () => {
    // Only show this button if there are already files loaded
    setIsImporting(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        {isImporting ? (
          // Show back button in import mode if we have files to go back to
          <button
            className={styles.button}
            onClick={handleBackClick}
            aria-label="Back to library"
          >
            <ArrowLeft size={24} />
          </button>
        ) : (
          // Show menu button in reading mode
          <button
            className={styles.button}
            onClick={() => setIsSidebarVisible(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        )}

        <div className={styles.actions}>
          <ThemeToggle />

          {/* Only show next button in reading mode, not in import mode */}
          {!isImporting && hasNext && (
            <button
              className={styles.nextButton}
              onClick={navigateNext}
              aria-label="Next article"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
