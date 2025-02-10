// components/reader/Import.js
import React, {useState} from "react";
import {useApp} from "../../contexts/AppContext";
import FileService from "../../services/FileService";
import {Upload, Folder} from "lucide-react";

const Import = () => {
  const {handleImport} = useApp();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectorySelect = async () => {
    try {
      setError("");
      setIsLoading(true);

      const handle = await window.showDirectoryPicker();
      console.log("Selected directory handle:", handle);

      const result = await FileService.processDirectory(handle);
      await handleImport(result.files, handle); // Pass both files and handle
    } catch (error) {
      console.error("Import error:", error);
      setError("Failed to import directory. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="import">
      <button
        className="import__button"
        onClick={handleDirectorySelect}
        disabled={isLoading}
      >
        <Folder />
        {isLoading ? "Importing..." : "Select Notion Export Folder"}
      </button>
      {error && <div className="import__error">{error}</div>}
    </div>
  );
};

export default Import;
