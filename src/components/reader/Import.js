// components/reader/Import.jsx
import React, {useState, useEffect} from "react";
import {Upload, Folder, FileUp, HardDrive} from "lucide-react";
import {useApp} from "../../contexts/AppContext";
import ImportService from "../../services/ImportService";
import styles from "./Import.module.css";

const Import = () => {
  const {handleImport} = useApp();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize ImportService
  useEffect(() => {
    const initService = async () => {
      try {
        await ImportService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize ImportService:", error);
        setError("Failed to initialize. Please refresh and try again.");
      }
    };

    initService();
  }, []);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const importedFiles = await ImportService.processFiles(files);
      await handleImport(importedFiles);
    } catch (error) {
      console.error("Error importing files:", error);
      setError(`Error importing files: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log("Processing ZIP file:", file.name);
      const importedFiles = await ImportService.processZipFile(file);
      await handleImport(importedFiles);
    } catch (error) {
      console.error("Error processing ZIP:", error);
      setError(`Error processing ZIP: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleDirectorySelect = async () => {
    if (!ImportService.isDirectoryPickerSupported()) {
      setError("Directory picker is not supported in your browser.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const dirHandle = await window.showDirectoryPicker();
      const importedFiles = await ImportService.processDirectory(dirHandle);
      await handleImport(importedFiles, dirHandle);
    } catch (error) {
      console.error("Error importing directory:", error);

      // Special handling for user abort
      if (error.name === "AbortError") {
        setError(null); // User cancelled, no error to show
      } else {
        setError(`Error importing directory: ${error.message}`);
      }

      setIsProcessing(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Initializing...</div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Import Markdown Files</h1>

        <div className={styles.options}>
          <label className={styles.option}>
            <input
              type="file"
              accept=".md"
              multiple
              onChange={handleFileUpload}
              className={styles.hidden}
              disabled={isProcessing}
            />
            <div className={styles.button}>
              <FileUp size={20} />
              <span>Select Markdown Files</span>
            </div>
          </label>

          <label className={styles.option}>
            <input
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              className={styles.hidden}
              disabled={isProcessing}
            />
            <div className={styles.button}>
              <Upload size={20} />
              <span>Upload ZIP Archive</span>
            </div>
          </label>

          {ImportService.isDirectoryPickerSupported() && (
            <button
              className={styles.accentButton}
              onClick={handleDirectorySelect}
              disabled={isProcessing}
            >
              <Folder size={20} />
              <span>Select Folder</span>
            </button>
          )}
        </div>

        {isProcessing && (
          <div className={styles.processing}>
            Processing files... This may take a moment.
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
};

export default Import;
