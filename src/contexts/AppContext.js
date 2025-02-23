// contexts/AppContext.js
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {getAnnotationService} from "../services/AnnotationService";
import OfflineService from "../services/OfflineService";
import {getFileStorageService} from "../services/FileStorageService";

const AppContext = createContext(null);

export const AppProvider = ({children}) => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isImporting, setIsImporting] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [fileStorageService, setFileStorageService] = useState(null);

  //offline PWA support
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cachedFiles, setCachedFiles] = useState([]);

  // Annotation states
  const [annotationService, setAnnotationService] = useState(null);
  const [annotations, setAnnotations] = useState({});
  const [selectedParagraphs, setSelectedParagraphs] = useState(new Set());
  const [annotationText, setAnnotationText] = useState("");
  const [isAnnotating, setIsAnnotating] = useState(false);

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

  // Combined service initialization
  useEffect(() => {
    const initServices = async () => {
      // Initialize both services
      const [storage, annotation] = await Promise.all([
        getFileStorageService(),
        getAnnotationService(),
      ]);

      setFileStorageService(storage);
      setAnnotationService(annotation);

      // Load saved files
      try {
        const savedFiles = await storage.getFiles();
        if (savedFiles.length > 0) {
          setFiles(savedFiles);
          setIsImporting(false);
        }
      } catch (error) {
        console.error("Error loading saved files:", error);
      }
    };

    initServices();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load cached files
  useEffect(() => {
    const loadCachedFiles = async () => {
      const cached = await OfflineService.getCachedFiles();
      setCachedFiles(cached);
    };

    loadCachedFiles();
  }, []);

  const handleParagraphClick = useCallback(
    (index) => {
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
  }, [
    annotationService,
    currentFile,
    selectedParagraphs,
    annotationText,
    loadAnnotations,
  ]);

  const handleImport = useCallback(
    async (importedFiles, dirHandle) => {
      try {
        setFiles(importedFiles);
        setDirectoryHandle(dirHandle);
        setIsImporting(false);

        // Save imported files to persistent storage
        if (fileStorageService) {
          await fileStorageService.saveFiles(importedFiles);
        }
      } catch (error) {
        console.error("Import error:", error);
      }
    },
    [fileStorageService]
  );

  const handleFileSelect = useCallback(
    async (file) => {
      setCurrentFile(file);
      if (file) {
        await loadAnnotations(file.path);
        await OfflineService.cacheMarkdownFile(file);
      }
    },
    [loadAnnotations]
  );

  useEffect(() => {
    const loadCachedFiles = async () => {
      const cached = await OfflineService.getCachedFiles();
      setCachedFiles(cached);
    };

    loadCachedFiles();
  }, []);

  const cancelAnnotation = useCallback(() => {
    setSelectedParagraphs(new Set());
    setAnnotationText("");
    setIsAnnotating(false);
  }, []);

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
        isSidebarVisible,
        setIsSidebarVisible,
        isOnline,
        cachedFiles,
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
