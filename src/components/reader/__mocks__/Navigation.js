// Mock for Navigation component
import React from "react";

const Navigation = ({isVisible, onClose}) => {
  return (
    <div
      data-testid="mock-navigation"
      style={{display: isVisible ? "block" : "none"}}
    >
      <button data-testid="mock-navigation-close" onClick={onClose}>
        Close
      </button>
      <div data-testid="mock-navigation-content">Navigation Content</div>
    </div>
  );
};

export default Navigation;
