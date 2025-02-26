// components/reader/Header.jsx
import React from "react";
import {Menu, ChevronRight} from "lucide-react";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import ThemeToggle from "../shared/ThemeToggle";
import styles from "./Header.module.css";

const Header = () => {
  const {setIsSidebarVisible} = useApp();
  const {hasNext, navigateNext} = useFileNavigation();

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <button
          className={styles.button}
          onClick={() => setIsSidebarVisible(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <div className={styles.actions}>
          <ThemeToggle />

          {hasNext && (
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
