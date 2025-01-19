import React, {useState} from "react";
import {
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import "../styles/explorer.css";

const FileExplorer = ({files, onFileSelect}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleFolder = (path) => {
    console.log("Toggling folder:", path);
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleItemClick = (item) => {
    console.log("Item clicked:", item);
    if (item.type === "directory") {
      toggleFolder(item.path);
    } else {
      console.log("Selecting file:", item);
      onFileSelect(item);
    }
  };

  const renderItem = (item, depth = 0) => {
    const isFolder = item.type === "directory";
    const isExpanded = expandedFolders.has(item.path);

    if (isCollapsed) return null;

    return (
      <div key={item.path}>
        <div
          className="explorer__item"
          style={{paddingLeft: `${depth * 16 + 8}px`}}
          onClick={() => handleItemClick(item)}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <FolderOpen className="explorer__icon explorer__icon--folder" />
              <span className="explorer__name">{item.name}</span>
            </>
          ) : (
            <>
              <File className="explorer__icon explorer__icon--file" />
              <span className="explorer__name">{item.name}</span>
            </>
          )}
        </div>
        {isFolder && isExpanded && item.children && (
          <div>
            {item.children.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`explorer ${isCollapsed ? "explorer--collapsed" : ""}`}>
      <button
        className="explorer__toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Show file explorer" : "Hide file explorer"}
      >
        {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
      </button>
      <div className="explorer__content">
        {files.map((item) => renderItem(item))}
      </div>
    </div>
  );
};

export default FileExplorer;
