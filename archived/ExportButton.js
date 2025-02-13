// src/components/ExportButton.js

import React, {useState} from "react";
import exportService from "../services/ExportService";
import {Download} from "lucide-react";
import "./ExportButton.css";

const ExportButton = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportService.exportAndDownload();
    } catch (error) {
      console.error("Export failed:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="export-button"
      title="Export database"
    >
      <Download size={16} />
      {isExporting ? "Exporting..." : "Export Notes"}
    </button>
  );
};

export default ExportButton;
