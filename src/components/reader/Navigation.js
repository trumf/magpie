// components/reader/Navigation.jsx
import React, {useState} from "react";
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
import styles from "./Navigation.module.css";

const FileItem = ({item, level = 0, currentFile, handleFileSelect}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDirectory = item.type === "directory";

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const displayTitle = NavigationService.getDisplayTitle(item);
  const isActive = currentFile?.path === item.path;

  return (
    <>
      <div
        className={`${styles.item} ${isDirectory ? styles.directoryItem : ""} ${
          isActive ? styles.itemActive : ""
        }`}
        style={{paddingLeft: `${level * 16 + 12}px`}}
        onClick={isDirectory ? toggleExpand : () => handleFileSelect(item)}
      >
        <div className={styles.itemContent}>
          {isDirectory && (
            <button className={styles.expandButton} onClick={toggleExpand}>
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          {isDirectory ? <Folder size={16} /> : <FileText size={16} />}
          <span className={styles.itemName}>{displayTitle}</span>
        </div>
      </div>

      {isDirectory && isExpanded && item.children && (
        <div className={styles.children}>
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
        <div className={styles.overlay} onClick={handleOverlayClick} />
      )}

      <nav
        className={`${styles.navigation} ${
          isSidebarVisible ? styles.visible : ""
        }`}
      >
        <div className={styles.header}>
          <button
            className={styles.closeButton}
            onClick={() => setIsSidebarVisible(false)}
          >
            <X size={24} />
          </button>
          <div className={styles.actions}>
            <button className={styles.actionButton}>
              <Upload size={18} />
            </button>
            <button className={styles.actionButton}>
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className={styles.fileList}>
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
