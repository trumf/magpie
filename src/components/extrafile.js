import React, {useState, useEffect} from "react";
import {
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  RotateCcw,
} from "lucide-react";
import "../styles/explorer.css";
import ExportButton from "./ExportButton";

const FileExplorer = ({files, onFileSelect, onReset}) => {
  console.log("FileExplorer rendering, files count:", files?.length); // Debug log

  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug effect to track state changes
  useEffect(() => {
    console.log("FileExplorer state changed:", {
      expandedFoldersCount: expandedFolders.size,
      isCollapsed,
      isProcessing,
    });
  }, [expandedFolders, isCollapsed, isProcessing]);

  const toggleFolder = (path) => {
    if (isProcessing) return;

    console.log("Toggling folder:", path);
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleItemClick = async (item) => {
    if (isProcessing) {
      console.log("Already processing, skipping item click");
      return;
    }

    try {
      setIsProcessing(true);
      console.log("Item clicked:", item);

      if (item.type === "directory") {
        toggleFolder(item.path);
      } else {
        console.log("Selecting file:", item);
        await onFileSelect(item);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (isProcessing) return;
    console.log("Handling reset in FileExplorer");
    setExpandedFolders(new Set());
    setIsCollapsed(false);
    onReset();
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
      <div className="explorer__header">
        <ExportButton />
        {onReset && (
          <button
            className="explorer__reset"
            onClick={handleReset}
            disabled={isProcessing}
            title="Reset and import new files"
          >
            <RotateCcw size={16} />
          </button>
        )}
        <button
          className="explorer__toggle"
          onClick={() => !isProcessing && setIsCollapsed(!isCollapsed)}
          disabled={isProcessing}
          title={isCollapsed ? "Show file explorer" : "Hide file explorer"}
        >
          {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
      <div className="explorer__content">
        {files?.map((item) => renderItem(item))}
      </div>
    </div>
  );
};

export default FileExplorer;
