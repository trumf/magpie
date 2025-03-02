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
  const [isExpanded, setIsExpanded] = useState(level === 0); // Auto-expand first level
  const isDirectory = item.type === "directory";

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const displayTitle = NavigationService.getDisplayTitle(item);
  const isActive = currentFile?.path === item.path;

  // For directories, check if any children are active
  const hasActiveChild =
    isDirectory && currentFile
      ? (item.children || []).some((child) => {
          if (child.type === "directory") {
            return (
              child.path &&
              currentFile.path &&
              currentFile.path.startsWith(child.path)
            );
          }
          return child.path === currentFile.path;
        })
      : false;

  // Enhanced folder icon with badge showing count of markdown files
  const getDirectoryIcon = () => {
    if (!isDirectory || !item.children) return <Folder size={16} />;

    const fileCount = item.children.filter(
      (child) => child.type === "file" && child.name.endsWith(".md")
    ).length;

    return (
      <div className={styles.folderIconContainer}>
        <Folder size={16} />
        {fileCount > 0 && (
          <span className={styles.folderBadge}>{fileCount}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={`${styles.item} ${isDirectory ? styles.directoryItem : ""} ${
          isActive ? styles.itemActive : ""
        } ${hasActiveChild ? styles.parentOfActive : ""}`}
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
          {isDirectory ? getDirectoryIcon() : <FileText size={16} />}
          <span className={styles.itemName}>{displayTitle}</span>
        </div>
      </div>

      {isDirectory && isExpanded && item.children && (
        <div className={styles.children}>
          {item.children.map((child, index) => (
            <FileItem
              key={`${child.path}-${index}`}
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
          {files.map((item, index) => (
            <FileItem
              key={`${item.path}-${index}`}
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
