// contexts/AppContext.js
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import FileService from "../services/FileService";
import {getAnnotationService} from "../services/AnnotationService";

const AppContext = createContext(null);

export const AppProvider = ({children}) => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isImporting, setIsImporting] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState(null);

  // Annotation states
  const [annotationService, setAnnotationService] = useState(null);
  const [annotations, setAnnotations] = useState({});
  const [selectedParagraphs, setSelectedParagraphs] = useState(new Set());
  const [annotationText, setAnnotationText] = useState("");
  const [isAnnotating, setIsAnnotating] = useState(false);

  useEffect(() => {
    const initService = async () => {
      const service = await getAnnotationService();
      setAnnotationService(service);
    };
    initService();
  }, []);

  const handleParagraphClick = useCallback(
    (index) => {
      console.log("Paragraph clicked:", index);

      if (!isAnnotating) {
        setIsAnnotating(true);
        setSelectedParagraphs(new Set([index]));
      } else {
        setSelectedParagraphs((prevSelected) => {
          const newSelected = new Set(prevSelected);
          if (newSelected.has(index)) {
            newSelected.delete(index);
          } else {
            newSelected.add(index);
          }
          return newSelected;
        });
      }
    },
    [isAnnotating]
  );

  const saveAnnotation = useCallback(async () => {
    if (!annotationService || !currentFile) return;
    try {
      const paragraphs = currentFile.content
        .split("\n\n")
        .filter((p) => p.trim());

      for (const paragraphIndex of selectedParagraphs) {
        const paragraphText = paragraphs[paragraphIndex];
        await annotationService.trackParagraph(
          currentFile.path,
          paragraphText,
          paragraphIndex
        );

        if (annotationText.trim()) {
          await annotationService.addAnnotation({
            articleId: currentFile.path,
            paragraphIndex,
            text: annotationText,
            type: "note",
          });
        }
      }

      await loadAnnotations(currentFile.path);
      setSelectedParagraphs(new Set());
      setAnnotationText("");
      setIsAnnotating(false);
    } catch (error) {
      console.error("Failed to save annotation:", error);
    }
  }, [annotationService, currentFile, selectedParagraphs, annotationText]);

  const loadAnnotations = useCallback(
    async (articleId) => {
      if (!annotationService) return;
      try {
        const articleAnnotations =
          await annotationService.getAnnotationsForArticle(articleId);
        const annotationMap = {};
        articleAnnotations.forEach((annotation) => {
          if (!annotationMap[annotation.paragraphIndex]) {
            annotationMap[annotation.paragraphIndex] = [];
          }
          annotationMap[annotation.paragraphIndex].push(annotation);
        });
        setAnnotations(annotationMap);
      } catch (error) {
        console.error("Failed to load annotations:", error);
      }
    },
    [annotationService]
  );

  const handleImport = useCallback(async (importedFiles, dirHandle) => {
    try {
      setFiles(importedFiles);
      setDirectoryHandle(dirHandle);
      setIsImporting(false);
    } catch (error) {
      console.error("Import error:", error);
    }
  }, []);

  const handleFileSelect = useCallback(
    async (file) => {
      setCurrentFile(file);
      if (file) {
        await loadAnnotations(file.path);
      }
    },
    [loadAnnotations]
  );

  const cancelAnnotation = useCallback(() => {
    setSelectedParagraphs(new Set());
    setAnnotationText("");
    setIsAnnotating(false);
  }, []);

  const value = {
    files,
    currentFile,
    isImporting,
    directoryHandle,
    annotations,
    selectedParagraphs,
    isAnnotating,
    annotationText,
    handleImport,
    handleFileSelect,
    handleParagraphClick,
    setAnnotationText,
    saveAnnotation,
    cancelAnnotation,
  };

  console.log("Context state:", {
    hasCurrentFile: !!currentFile,
    isAnnotating,
    selectedParagraphsCount: selectedParagraphs.size,
  });

  return (
    <AppContext.Provider
      value={{
        files,
        currentFile,
        isImporting,
        directoryHandle,
        annotations,
        selectedParagraphs,
        isAnnotating,
        annotationText,
        handleImport,
        handleFileSelect,
        handleParagraphClick,
        setAnnotationText,
        saveAnnotation,
        cancelAnnotation,
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
