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

  const handleImport = useCallback(async (importedFiles, dirHandle) => {
    try {
      let processedFiles;
      if (dirHandle) {
        processedFiles = await FileService.processDirectory(dirHandle);
      } else {
        processedFiles = await FileService.processFiles(importedFiles);
      }
      setFiles(processedFiles);
      setIsImporting(false);
    } catch (error) {
      console.error("Import error:", error);
    }
  }, []);

  const handleFileSelect = useCallback(async (file) => {
    setCurrentFile(file);
    const db = await getDatabase();
    const fileAnnotations = await db.getAnnotations(file.path);
    setAnnotations(fileAnnotations);
  }, []);

  const addAnnotation = useCallback(
    async (annotation) => {
      try {
        const db = await getDatabase();
        await db.addAnnotation(annotation);
        const updatedAnnotations = await db.getAnnotations(currentFile.path);
        setAnnotations(updatedAnnotations);
      } catch (error) {
        console.error("Annotation error:", error);
      }
    },
    [currentFile]
  );

  return (
    <AppContext.Provider
      value={{
        files,
        currentFile,
        isImporting,
        annotations,
        handleImport,
        handleFileSelect,
        addAnnotation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
