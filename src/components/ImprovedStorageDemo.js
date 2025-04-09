import React, {useState, useEffect, useCallback} from "react";
import {getImprovedFileStorageService} from "../services/ImprovedFileStorageService";
import "../styles/ImprovedStorageDemo.css";

const ImprovedStorageDemo = () => {
  const [fileService, setFileService] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [assetCache, setAssetCache] = useState({});

  // Initialize the service
  useEffect(() => {
    const initService = async () => {
      try {
        const service = await getImprovedFileStorageService();
        setFileService(service);
        loadFiles(service);
      } catch (error) {
        console.error("Error initializing service:", error);
        setStatusMessage("Error initializing storage service");
      }
    };

    initService();
  }, []);

  // Load files from IndexedDB
  const loadFiles = async (service) => {
    setIsLoading(true);
    setStatusMessage("Loading files...");

    try {
      const allFiles = await service.getFiles();
      setFiles(allFiles);
      setStatusMessage(`Loaded ${allFiles.length} files`);
    } catch (error) {
      console.error("Error loading files:", error);
      setStatusMessage("Error loading files from storage");
    } finally {
      setIsLoading(false);
    }
  };

  // Load an asset by ID
  const loadAsset = useCallback(
    async (assetId) => {
      if (!fileService || !assetId) return null;

      // Return from cache if already loaded
      if (assetCache[assetId]) {
        return assetCache[assetId];
      }

      try {
        const asset = await fileService.getAsset(assetId);
        if (asset) {
          // Update cache
          setAssetCache((prevCache) => ({
            ...prevCache,
            [assetId]: asset.url,
          }));
          return asset.url;
        }
      } catch (error) {
        console.error(`Error loading asset ${assetId}:`, error);
      }

      return null;
    },
    [fileService, assetCache]
  );

  // Handle file selection
  const handleFileSelect = async (file) => {
    if (file.type === "directory") {
      setSelectedFile(file);
      setFileContent("");
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Loading file: ${file.name}...`);

    try {
      setSelectedFile(file);
      setFileContent(file.content || "No content available");
      setStatusMessage("");
    } catch (error) {
      console.error("Error selecting file:", error);
      setStatusMessage("Error loading file content");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Only accept zip files
    if (!file.name.endsWith(".zip")) {
      setStatusMessage("Please select a ZIP file");
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Uploading and processing ${file.name}...`);

    try {
      const result = await fileService.processAndStoreZipFile(file);
      setStatusMessage(
        `Imported ${result.fileCount} files and ${result.assetCount} assets`
      );
      loadFiles(fileService);
    } catch (error) {
      console.error("Error uploading file:", error);
      setStatusMessage(`Error uploading file: ${error.message}`);
    } finally {
      setIsLoading(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  // Handle database clearing
  const handleClearDatabase = async () => {
    if (window.confirm("Are you sure you want to clear all stored files?")) {
      setIsLoading(true);
      setStatusMessage("Clearing database...");

      try {
        await fileService.clearDatabase();
        setFiles([]);
        setSelectedFile(null);
        setFileContent("");
        setAssetCache({});
        setStatusMessage("Database cleared successfully");
      } catch (error) {
        console.error("Error clearing database:", error);
        setStatusMessage("Error clearing database");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Process markdown content
  const processMarkdownContent = useCallback(
    (content) => {
      if (!content) return "";

      // Process markdown image syntax
      return content.replace(
        /!\[(.*?)\]\(asset:\/\/(.*?)\)/g,
        (match, alt, assetId) => {
          // Check if we already have this asset in cache
          const assetUrl = assetCache[assetId];

          if (assetUrl) {
            return `<div class="markdown-image">
          <img src="${assetUrl}" alt="${alt || "Image"}" />
          <div class="image-caption">${alt || ""}</div>
        </div>`;
          }

          // If not in cache, load it
          const placeholderId = `asset-placeholder-${assetId}`;

          // Queue this asset for loading
          setTimeout(() => {
            loadAsset(assetId).then((url) => {
              if (url) {
                const placeholder = document.getElementById(placeholderId);
                if (placeholder) {
                  placeholder.innerHTML = `
                <img src="${url}" alt="${alt || "Image"}" />
                <div class="image-caption">${alt || ""}</div>
              `;
                  placeholder.classList.add("loaded");
                }
              }
            });
          }, 0);

          return `<div id="${placeholderId}" class="markdown-image loading" data-asset-id="${assetId}">
        <div class="image-placeholder">Loading image...</div>
      </div>`;
        }
      );
    },
    [assetCache, loadAsset]
  );

  // Render file content with image support
  const renderFileContent = () => {
    if (!selectedFile || !fileContent) return null;

    // Process content to handle assets
    const processedContent = processMarkdownContent(fileContent);

    return (
      <div className="file-content">
        <h3>{selectedFile.name}</h3>
        <div dangerouslySetInnerHTML={{__html: processedContent}}></div>
      </div>
    );
  };

  return (
    <div className="improved-storage-demo">
      <h2>Improved Storage Demo</h2>

      <div className="controls">
        <div className="upload-container">
          <input
            type="file"
            id="zipFileInput"
            accept=".zip"
            onChange={handleFileUpload}
            disabled={isLoading || !fileService}
          />
          <label htmlFor="zipFileInput" className="button">
            {isLoading ? "Processing..." : "Upload ZIP File"}
          </label>
        </div>

        <button
          onClick={() => loadFiles(fileService)}
          disabled={isLoading || !fileService}
          className="button"
        >
          Reload Files
        </button>

        <button
          onClick={handleClearDatabase}
          disabled={isLoading || !fileService}
          className="button danger"
        >
          Clear Database
        </button>
      </div>

      {statusMessage && <div className="status-message">{statusMessage}</div>}

      <div className="content-container">
        <div className="file-list">
          <h3>Files ({files.length})</h3>
          {files.length === 0 ? (
            <p className="empty-message">
              No files available. Upload a ZIP file to get started.
            </p>
          ) : (
            <ul>
              {files.map((file) => (
                <li
                  key={file.path}
                  className={`file-item ${
                    selectedFile && selectedFile.path === file.path
                      ? "selected"
                      : ""
                  } ${file.type}`}
                  onClick={() => handleFileSelect(file)}
                >
                  <span className="file-icon">
                    {file.type === "directory" ? "📁" : "📄"}
                  </span>
                  <span className="file-name">{file.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="file-viewer">
          {selectedFile ? (
            renderFileContent()
          ) : (
            <p className="empty-message">Select a file to view its content</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImprovedStorageDemo;
