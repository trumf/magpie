import React, {useState, useEffect} from "react";
import {
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#ffffff",
  },
  uploadContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "start",
    height: "100vh",
  },
  uploadButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  mainContent: {
    display: "flex",
    flex: 1,
    alignItems: "left",
  },
  fileExplorer: {
    width: "280px",
    borderRight: "1px solid #e5e7eb",
    height: "100vh",
    overflowY: "auto",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px",
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },
  fileCount: {
    marginLeft: "8px",
    color: "#6b7280",
    fontSize: "12px",
  },
  markdownContainer: {
    flex: 1,
    overflow: "auto",
    padding: "16px",
  },
  markdownContent: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    height: "calc(100vh - 32px)",
    overflow: "auto",
    padding: "32px",
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6b7280",
  },
};

// Helper function to decode paths
const decodePath = (path) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

// Custom renderer for images that handles relative paths
const ImageRenderer = ({src, alt, directoryHandle, filePath}) => {
  const [imageSrc, setImageSrc] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Get the directory name from the markdown file path
        const markdownPathParts = decodePath(filePath).split("/");
        const markdownDir = markdownPathParts.slice(0, -1).join("/");

        // Get the image path, handling both encoded and unencoded paths
        const decodedSrc = decodePath(src);

        // Split the path and filter out empty parts
        const pathParts = decodedSrc.split("/").filter(Boolean);

        // Start from the root directory handle
        let currentHandle = directoryHandle;

        // First navigate to the markdown file's directory
        for (const part of markdownDir.split("/").filter(Boolean)) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        // Then navigate to the image
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (i === pathParts.length - 1) {
            // Last part is the file
            currentHandle = await currentHandle.getFileHandle(part);
          } else {
            // Navigate through directories
            currentHandle = await currentHandle.getDirectoryHandle(part);
          }
        }

        // Get the image file
        if (currentHandle.kind === "file") {
          const file = await currentHandle.getFile();
          const blob = new Blob([await file.arrayBuffer()], {
            type: file.type || "image/png",
          });
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
          setError(null);
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setError(`Failed to load image: ${src}`);
        setImageSrc("");
      }
    };

    if (src && directoryHandle) {
      loadImage();
    }

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, directoryHandle, filePath]);

  if (error) {
    return <div style={{color: "red", fontSize: "14px"}}>{error}</div>;
  }

  return imageSrc ? (
    <img src={imageSrc} alt={alt} style={{maxWidth: "100%"}} />
  ) : (
    <div
      style={{padding: "1rem", backgroundColor: "#f0f0f0", borderRadius: "4px"}}
    >
      Loading image...
    </div>
  );
};

// FileExplorer component to display the folder structure
const FileExplorer = ({files, onFileSelect}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const toggleFolder = (path) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderItem = (item, depth = 0) => {
    const isFolder = item.type === "directory";
    const isExpanded = expandedFolders.has(item.path);

    return (
      <div key={item.path}>
        <div
          style={{
            ...styles.fileItem,
            paddingLeft: `${depth * 16 + 8}px`,
          }}
          onClick={() =>
            isFolder ? toggleFolder(item.path) : onFileSelect(item)
          }
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              <FolderOpen
                style={{
                  width: 16,
                  height: 16,
                  margin: "0 8px",
                  color: "#3b82f6",
                }}
              />
              <span>{item.name}</span>
              {item.children && (
                <span style={styles.fileCount}>
                  (
                  {
                    item.children.filter((child) => child.name.endsWith(".md"))
                      .length
                  }{" "}
                  files)
                </span>
              )}
            </>
          ) : (
            <>
              <File
                style={{
                  width: 16,
                  height: 16,
                  margin: "0 8px",
                  color: "#6b7280",
                }}
              />
              <span>{item.name}</span>
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
    <div style={styles.fileExplorer}>
      {files.map((item) => renderItem(item))}
    </div>
  );
};

// MarkdownViewer component to display the selected file
const MarkdownViewer = ({content, directoryHandle, filePath}) => {
  if (!content) {
    return (
      <div style={styles.emptyState}>Select a file to view its contents</div>
    );
  }

  return (
    <div style={{padding: "32px", maxWidth: "800px", margin: "0 auto"}}>
      <ReactMarkdown
        components={{
          img: ({node, ...props}) => (
            <ImageRenderer
              {...props}
              directoryHandle={directoryHandle}
              filePath={filePath}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Main App component
const MarkdownReader = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [directoryHandle, setDirectoryHandle] = useState(null);

  const processDirectory = async (dirHandle, path = "") => {
    const entries = [];
    for await (const entry of dirHandle.values()) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.kind === "directory") {
        const children = await processDirectory(entry, entryPath);
        entries.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children,
          handle: entry,
        });
      } else if (entry.name.endsWith(".md")) {
        entries.push({
          type: "file",
          name: entry.name,
          path: entryPath,
          handle: entry,
        });
      }
    }
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const handleFolderSelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      const processedFiles = await processDirectory(handle);
      setFiles(processedFiles);
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  const handleFileSelect = async (file) => {
    try {
      const fileHandle = file.handle;
      const fileData = await fileHandle.getFile();
      const content = await fileData.text();
      setSelectedFile(file);
      setFileContent(content);
    } catch (error) {
      console.error("Error reading file:", error);
      setFileContent("Error loading file content");
    }
  };

  return (
    <div style={styles.container}>
      {!directoryHandle && (
        <div style={styles.uploadContainer}>
          <button onClick={handleFolderSelect} style={styles.uploadButton}>
            <Upload size={16} />
            Select Folder
          </button>
        </div>
      )}

      {directoryHandle && (
        <div style={styles.mainContent}>
          <FileExplorer files={files} onFileSelect={handleFileSelect} />
          <div style={styles.markdownContainer}>
            <div style={styles.markdownContent}>
              <MarkdownViewer
                content={fileContent}
                directoryHandle={directoryHandle}
                filePath={selectedFile?.path || ""}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownReader;
