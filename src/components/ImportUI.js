import React, {useState, useRef} from "react";
import {Upload, Folder, FileText, AlertCircle, HelpCircle} from "lucide-react";
import importService from "../services/ImportService";
import "../styles/ImportUI.css";

const ImportUI = ({onImportComplete}) => {
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const zipInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleZipUpload = async (event) => {
    try {
      setError("");
      setImporting(true);
      const file = event.target.files[0];

      if (!file || !file.name.endsWith(".zip")) {
        setError("Please select a ZIP file containing your Notion export");
        return;
      }

      const files = await importService.processZipFile(file);
      onImportComplete(files);
    } catch (error) {
      console.error("Error processing ZIP:", error);
      setError(
        "Error processing ZIP file. Please make sure it's a valid Notion export."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleDirectorySelect = async () => {
    try {
      setError("");
      setImporting(true);
      const handle = await window.showDirectoryPicker();
      const files = await importService.processDirectory(handle);
      onImportComplete(files);
    } catch (error) {
      console.error("Error selecting directory:", error);
      setError(
        "Error accessing directory. Please try uploading a ZIP file instead."
      );
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = async (event) => {
    try {
      setError("");
      setImporting(true);
      const files = await importService.processFiles(
        Array.from(event.target.files)
      );
      if (files.length === 0) {
        setError("No markdown files found. Please select .md files.");
        return;
      }
      onImportComplete(files);
    } catch (error) {
      console.error("Error processing files:", error);
      setError("Error processing files. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import">
      <div className="import__container">
        <div className="import__primary">
          <input
            type="file"
            ref={zipInputRef}
            onChange={handleZipUpload}
            accept=".zip"
            className="hidden"
            style={{display: "none"}}
          />
          <button
            onClick={() => zipInputRef.current?.click()}
            disabled={importing}
            className="import__button import__button--primary"
          >
            <Upload size={20} />
            {importing ? "Importing..." : "Import Notion Export (ZIP)"}
          </button>
          <p className="import__description">
            Recommended: Export from Notion, zip the folder, then upload here
          </p>
        </div>

        <div className="import__buttons-group">
          {importService.isDirectoryPickerSupported() && (
            <button
              onClick={handleDirectorySelect}
              disabled={importing}
              className="import__button import__button--secondary"
            >
              <Folder size={18} />
              Select Directory
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".md"
            multiple
            className="hidden"
            style={{display: "none"}}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="import__button import__button--secondary"
          >
            <FileText size={18} />
            Select Files
          </button>
        </div>
      </div>

      <button
        onClick={() => setShowHelp(!showHelp)}
        className="import__help-button"
      >
        <HelpCircle size={16} />
        How to import?
      </button>

      {showHelp && (
        <div className="import__help">
          <h3 className="import__help-title">Import Options:</h3>
          <ol className="import__help-list">
            <li className="import__help-item">
              <strong>ZIP Import (Recommended):</strong>
              <ul className="import__help-sublist">
                <li>Export your pages from Notion</li>
                <li>Zip the exported folder</li>
                <li>Upload the ZIP file here</li>
              </ul>
            </li>
            {importService.isDirectoryPickerSupported() && (
              <li className="import__help-item">
                <strong>Directory Import:</strong>
                <br />
                Select an entire folder (desktop browsers only)
              </li>
            )}
            <li className="import__help-item">
              <strong>File Import:</strong>
              <br />
              Select one or more markdown files directly
            </li>
          </ol>
        </div>
      )}

      {error && (
        <div className="import__error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
};

export default ImportUI;
