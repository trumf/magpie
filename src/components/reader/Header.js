// components/reader/Header.js
import React from "react";
import {Menu, ChevronRight} from "lucide-react";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import "../../styles/header.css";

const Header = () => {
  const {setIsSidebarVisible} = useApp();
  const {hasNext, navigateNext} = useFileNavigation();

  return (
    <header className="header">
      <div className="header__content">
        <button
          className="header__button"
          onClick={() => setIsSidebarVisible(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        {hasNext && (
          <button
            className="header__button header__button--next"
            onClick={navigateNext}
            aria-label="Next article"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
