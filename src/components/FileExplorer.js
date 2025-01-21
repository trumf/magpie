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
import ExportButton from "./ExportButton";
import "../styles/explorer.css";

const FileExplorer = ({files, onFileSelect, onReset}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleFolder = (path) => {
    if (isProcessing) return;

    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleItemClick = async (item) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (item.type === "directory") {
        toggleFolder(item.path);
      } else {
        await onFileSelect(item);
        // Close explorer on mobile after selecting a file
        setIsVisible(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (isProcessing) return;
    setExpandedFolders(new Set());
    setIsVisible(false);
    onReset();
  };

  const renderItem = (item, depth = 0) => {
    const isFolder = item.type === "directory";
    const isExpanded = expandedFolders.has(item.path);

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
    <>
      {/* Backdrop for mobile */}
      <div
        className={`explorer__backdrop ${
          isVisible ? "explorer__backdrop--visible" : ""
        }`}
        onClick={() => setIsVisible(false)}
      />

      {/* Explorer Panel */}
      <div className={`explorer ${isVisible ? "explorer--visible" : ""}`}>
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
        </div>

        <div className="explorer__content">
          {files?.map((item) => renderItem(item))}
        </div>
      </div>

      {/* Toggle button - visible on mobile only */}
      <button
        className="explorer__toggle"
        onClick={() => !isProcessing && setIsVisible(!isVisible)}
        disabled={isProcessing}
      >
        {isVisible ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
      </button>
    </>
  );
};

export default FileExplorer;
