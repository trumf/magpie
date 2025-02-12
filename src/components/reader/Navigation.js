// components/reader/Navigation.js
import React from "react";
import {useApp} from "../../contexts/AppContext";
import {
  PanelLeftClose,
  Upload,
  Settings,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
} from "lucide-react";
import "../../styles/navigation.css";

// Separate component for rendering file/directory items
const FileItem = ({item, level = 0, currentFile, handleFileSelect}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isDirectory = item.type === "directory";

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

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
          <span className="navigation__item-name">{item.name}</span>
        </div>
      </div>

      {/* Render children if directory is expanded */}
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

  return (
    <>
      <nav
        className={`navigation ${
          isSidebarVisible ? "navigation--visible" : ""
        }`}
      >
        <div className="navigation__header">
          <button
            className="navigation__toggle"
            onClick={() => setIsSidebarVisible(false)}
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

      {!isSidebarVisible && (
        <button
          className="navigation__show-button"
          onClick={() => setIsSidebarVisible(true)}
        >
          <ChevronRight />
        </button>
      )}
    </>
  );
};

export default Navigation;
