import React, {useState, useEffect} from "react";
import {Upload, Check, AlertCircle} from "lucide-react";
import databaseService from "./services/DatabaseService";

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "800px",
    margin: "0 auto",
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
  statusContainer: {
    marginTop: "1rem",
    padding: "1rem",
    borderRadius: "6px",
    backgroundColor: "#f3f4f6",
  },
  progressBar: {
    width: "100%",
    height: "4px",
    backgroundColor: "#e5e7eb",
    borderRadius: "2px",
    marginTop: "0.5rem",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: "2px",
    transition: "width 0.3s ease",
  },
  fileList: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  fileItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem",
    backgroundColor: "#ffffff",
    borderRadius: "4px",
    border: "1px solid #e5e7eb",
  },
};

const DatabaseImporter = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [processedFiles, setProcessedFiles] = useState([]);
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      try {
        await databaseService.initialize();
        setDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        setStatus("Database initialization failed");
      }
    };
    initDB();
  }, []);

  // Function to process a single markdown file
  const processMarkdownFile = async (fileHandle, path) => {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();

      // Extract title from the first # heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.name;

      // Insert article into database
      const articleId = await databaseService.addArticle({
        title,
        content,
        filePath: path,
        createdAt: new Date().toISOString(),
      });

      // Extract image references from markdown
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        const [, alt, imagePath] = match;
        const decodedPath = decodeURIComponent(imagePath);

        await databaseService.addImage({
          articleId,
          fileName: alt || "Untitled",
          filePath: decodedPath,
          createdAt: new Date().toISOString(),
        });
      }

      setProcessedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          status: "success",
          message: "Imported successfully",
        },
      ]);
    } catch (error) {
      console.error("Error processing file:", error);
      setProcessedFiles((prev) => [
        ...prev,
        {
          name: fileHandle.name,
          status: "error",
          message: error.message,
        },
      ]);
    }
  };

  // Function to process all files in a directory
  const processDirectory = async (dirHandle, path = "") => {
    for await (const entry of dirHandle.values()) {
      const entryPath = `${path}/${entry.name}`;

      if (entry.kind === "directory") {
        await processDirectory(entry, entryPath);
      } else if (entry.name.endsWith(".md")) {
        await processMarkdownFile(entry, entryPath);
        setProgress((prev) => Math.min(prev + 1, 100));
      }
    }
  };

  // Handler for folder selection
  const handleFolderSelect = async () => {
    if (!dbInitialized) {
      setStatus("Database not initialized yet");
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      setProcessedFiles([]);
      setStatus("Processing files...");

      // Clear existing data
      await databaseService.clearDatabase();

      // Get folder handle and process files
      const dirHandle = await window.showDirectoryPicker();
      await processDirectory(dirHandle);

      setStatus("Import completed");
    } catch (error) {
      console.error("Error importing files:", error);
      setStatus("Error importing files");
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={handleFolderSelect}
        style={{
          ...styles.uploadButton,
          opacity: dbInitialized ? 1 : 0.5,
          cursor: dbInitialized ? "pointer" : "not-allowed",
        }}
        disabled={!dbInitialized || importing}
      >
        <Upload size={16} />
        {!dbInitialized
          ? "Initializing Database..."
          : importing
          ? "Importing..."
          : "Select Folder to Import"}
      </button>

      {(status || importing) && (
        <div style={styles.statusContainer}>
          <div>{status}</div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {processedFiles.length > 0 && (
        <div style={styles.fileList}>
          {processedFiles.map((file, index) => (
            <div key={index} style={styles.fileItem}>
              {file.status === "success" ? (
                <Check size={16} color="green" />
              ) : (
                <AlertCircle size={16} color="red" />
              )}
              <span>{file.name}</span>
              <span
                style={{
                  color: file.status === "success" ? "green" : "red",
                  fontSize: "14px",
                  marginLeft: "auto",
                }}
              >
                {file.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DatabaseImporter;
