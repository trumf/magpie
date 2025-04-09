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
// Import the asset service
import {getAssetService} from "../services/AssetService";

const AppContext = createContext(null);

export const AppProvider = ({children}) => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isImporting, setIsImporting] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState(null);

  // Change the default value to false so the sidebar is initially collapsed
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const [fileStorageService, setFileStorageService] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Add to state declarations
  const [assetService, setAssetService] = useState(null);

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

  // Add to combined service initialization
  useEffect(() => {
    let mounted = true;

    const initServices = async () => {
      try {
        // Initialize services
        const storage = await getFileStorageService();
        const annotation = await getAnnotationService();
        const asset = await getAssetService();

        if (!mounted) return;

        setFileStorageService(storage);
        setAnnotationService(annotation);
        setAssetService(asset);

        // Load saved files
        try {
          const savedFiles = await storage.getFiles();
          if (savedFiles.length > 0 && mounted) {
            setFiles(savedFiles);
            setIsImporting(false);
          }
        } catch (error) {
          console.error("Error loading saved files:", error);
        }

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing services:", error);
      }
    };

    initServices();

    return () => {
      mounted = false;
    };
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
        // Merge imported files with existing files instead of replacing them
        setFiles((prevFiles) => {
          // Create a map of existing files by path for easy lookup
          const existingFilesMap = new Map(
            prevFiles.map((file) => [file.path, file])
          );

          // Add or update files from the import
          importedFiles.forEach((file) => {
            existingFilesMap.set(file.path, file);
          });

          // Convert the map back to an array
          return Array.from(existingFilesMap.values());
        });

        setDirectoryHandle(dirHandle);
        setIsImporting(false);

        // When files are imported, set the sidebar to visible
        setIsSidebarVisible(true);

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

  // Add assetService to the context value
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
        isInitialized,
        assetService, // Add this to expose the service
        setIsImporting, // This will be helpful for navigation
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
