// components/reader/Navigation.js
import React from "react";
import {useApp} from "../../contexts/AppContext";
import {
  X,
  Upload,
  Settings,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
} from "lucide-react";
import NavigationService from "../../services/NavigationService";
import "../../styles/navigation.css";

const FileItem = ({item, level = 0, currentFile, handleFileSelect}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isDirectory = item.type === "directory";

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const displayTitle = NavigationService.getDisplayTitle(item);

  return (
    <>
      <div
        className={`navigation__item ${
          isDirectory ? "navigation__item--directory" : "navigation__item--file"
        } ${currentFile?.path === item.path ? "navigation__item--active" : ""}`}
        style={{paddingLeft: `${level * 16 + 12}px`}}
        onClick={isDirectory ? toggleExpand : () => handleFileSelect(item)}
      >
        <div className="navigation__item-content">
          {isDirectory && (
            <button
              className="navigation__expand-button"
              onClick={toggleExpand}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          {isDirectory ? <Folder size={16} /> : <FileText size={16} />}
          <span className="navigation__item-name">{displayTitle}</span>
        </div>
      </div>

      {isDirectory && isExpanded && item.children && (
        <div className="navigation__children">
          {item.children.map((child) => (
            <FileItem
              key={child.path}
              item={child}
              level={level + 1}
              currentFile={currentFile}
              handleFileSelect={handleFileSelect}
            />
          ))}
        </div>
      )}
    </>
  );
};

const Navigation = () => {
  const {
    files,
    currentFile,
    handleFileSelect,
    isSidebarVisible,
    setIsSidebarVisible,
  } = useApp();

  const handleOverlayClick = () => {
    setIsSidebarVisible(false);
  };

  return (
    <>
      {isSidebarVisible && (
        <div className="navigation__overlay" onClick={handleOverlayClick} />
      )}

      <nav
        className={`navigation ${
          isSidebarVisible ? "navigation--visible" : ""
        }`}
      >
        <div className="navigation__header">
          <button
            className="navigation__close"
            onClick={() => setIsSidebarVisible(false)}
          >
            <X size={24} />
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
          {files.map((item) => (
            <FileItem
              key={item.path}
              item={item}
              currentFile={currentFile}
              handleFileSelect={handleFileSelect}
            />
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
