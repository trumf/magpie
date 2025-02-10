// components/reader/Navigation.js
import React from "react";
import {useApp} from "../../contexts/AppContext";
import {PanelLeftClose, Upload, Settings, ChevronRight} from "lucide-react";
import "../../styles/navigation.css";

const Navigation = ({isVisible, setIsVisible}) => {
  const {files, currentFile, handleFileSelect} = useApp();

  return (
    <>
      <nav className={`navigation ${isVisible ? "navigation--visible" : ""}`}>
        <div className="navigation__header">
          <button
            className="navigation__toggle"
            onClick={() => setIsVisible(false)}
          >
            <PanelLeftClose />
          </button>
          <div className="navigation__actions">
            <button className="navigation__button">
              <Upload size={18} />
            </button>
            <button className="navigation__button">
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className="navigation__files">
          {files.map((file) => (
            <div
              key={file.path}
              className={`navigation__file ${
                currentFile?.path === file.path
                  ? "navigation__file--active"
                  : ""
              }`}
              onClick={() => handleFileSelect(file)}
            >
              {file.name}
            </div>
          ))}
        </div>
      </nav>

      {!isVisible && (
        <button
          className="navigation__show-button"
          onClick={() => setIsVisible(true)}
        >
          <ChevronRight />
        </button>
      )}
    </>
  );
};

export default Navigation;
