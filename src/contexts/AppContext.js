// contexts/AppContext.js
import React, {createContext, useContext, useState, useCallback} from "react";
import FileService from "../services/FileService";
import {getDatabase} from "../services/DatabaseService";

const AppContext = createContext(null);

export const AppProvider = ({children}) => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isImporting, setIsImporting] = useState(true);
  const [annotations, setAnnotations] = useState({});
  const [directoryHandle, setDirectoryHandle] = useState(null);

  const handleImport = useCallback(async (importedFiles, dirHandle) => {
    console.log("Importing with directory handle:", dirHandle);
    try {
      setFiles(importedFiles);
      setDirectoryHandle(dirHandle);
      setIsImporting(false);
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file) => {
      console.log("Selecting file with directory handle:", directoryHandle);
      setCurrentFile(file);
      const db = await getDatabase();
      const fileAnnotations = await db.getAnnotations(file.path);
      setAnnotations(fileAnnotations);
    },
    [directoryHandle]
  );

  const value = {
    files,
    currentFile,
    isImporting,
    annotations,
    directoryHandle,
    handleImport,
    handleFileSelect,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
