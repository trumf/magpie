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
import {getAssetService} from "../services/AssetService";

const AppContext = createContext(null);

export const AppProvider = ({children}) => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [isImporting, setIsImporting] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Service instances
  const [fileStorageService, setFileStorageService] = useState(null);
  const [annotationService, setAnnotationService] = useState(null);
  const [assetService, setAssetService] = useState(null);

  // Annotation states
  const [annotations, setAnnotations] = useState({});
  const [selectedParagraphs, setSelectedParagraphs] = useState(new Set());
  const [annotationText, setAnnotationText] = useState("");
  const [isAnnotating, setIsAnnotating] = useState(false);

  // Services initialization - combined into a single effect
  useEffect(() => {
    console.log("Initializing services...");
    let mounted = true;

    const initServices = async () => {
      try {
        // Initialize all services in parallel
        const [storage, annotation, asset] = await Promise.all([
          getFileStorageService(),
          getAnnotationService(),
          getAssetService(),
        ]);

        if (!mounted) return;

        console.log("All services initialized successfully");

        // Set service instances
        setFileStorageService(storage);
        setAnnotationService(annotation);
        setAssetService(asset);

        // Load saved files from IndexedDB
        try {
          console.log("Loading saved files from database...");
          const savedFiles = await storage.getFiles();

          if (savedFiles && savedFiles.length > 0 && mounted) {
            console.log(`Loaded ${savedFiles.length} files from database`);
            setFiles(savedFiles);
            setIsImporting(false);
          } else {
            console.log("No files found in database");
            setIsImporting(true);
          }
        } catch (error) {
          console.error("Error loading saved files:", error);
          setIsImporting(true);

          // Try to recover from localStorage as fallback
          try {
            const fileIndexString = localStorage.getItem("magpieFileIndex");
            if (fileIndexString) {
              const fileIndex = JSON.parse(fileIndexString);
              if (fileIndex.length > 0 && mounted) {
                console.log(
                  `Recovered ${fileIndex.length} file references from localStorage`
                );
                setFiles(fileIndex);
              }
            }
          } catch (lsError) {
            console.error("Error recovering from localStorage:", lsError);
          }
        }

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error initializing services:", error);
        if (mounted) {
          setIsInitialized(true); // Still set initialized to prevent infinite loading
        }
      }
    };

    initServices();

    return () => {
      mounted = false;
    };
  }, []);

  // Cancel annotation mode
  const cancelAnnotation = useCallback(() => {
    setSelectedParagraphs(new Set());
    setAnnotationText("");
    setIsAnnotating(false);
  }, []);

  // File importing (handles ZIP archives, directories, individual files)
  const handleImport = useCallback(
    async (importedFiles, dirHandle) => {
      if (!importedFiles || importedFiles.length === 0) {
        console.warn("No files to import");
        return;
      }

      try {
        console.log(`Importing ${importedFiles.length} files...`);

        // Update UI state first for immediate feedback
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

        // If a directory handle was provided, save it
        if (dirHandle) {
          setDirectoryHandle(dirHandle);
        }

        // Exit import mode if we weren't already in normal mode
        setIsImporting(false);

        // Show sidebar with new content
        setIsSidebarVisible(true);

        // Then persist to database if service is available
        if (fileStorageService) {
          try {
            console.log("Saving files to database...");
            await fileStorageService.saveFiles(importedFiles);
            console.log("Files saved to database successfully");
          } catch (dbError) {
            console.error("Error saving to database:", dbError);

            // Fallback to localStorage for critical metadata
            try {
              // Only store minimal data to avoid localStorage size limits
              const minimalData = importedFiles.map((file) => ({
                path: file.path,
                name: file.name,
                type: file.type,
                // Don't include content in localStorage
                hasContent: !!file.content,
              }));

              localStorage.setItem(
                "magpieFileIndex",
                JSON.stringify(minimalData)
              );
              console.log("File index saved to localStorage as fallback");
            } catch (lsError) {
              console.error("Error saving to localStorage:", lsError);
            }
          }
        }
      } catch (error) {
        console.error("Import error:", error);
      }
    },
    [fileStorageService]
  );

  // Annotation loading for current file
  const loadAnnotations = useCallback(
    async (articleId) => {
      if (!annotationService || !articleId) return;

      try {
        console.log(`Loading annotations for article: ${articleId}`);
        const articleAnnotations =
          await annotationService.getAnnotationsForArticle(articleId);

        // Organize annotations by paragraph index
        const annotationMap = {};
        articleAnnotations.forEach((annotation) => {
          if (!annotationMap[annotation.paragraphIndex]) {
            annotationMap[annotation.paragraphIndex] = [];
          }
          annotationMap[annotation.paragraphIndex].push(annotation);
        });

        setAnnotations(annotationMap);
        console.log(`Loaded ${articleAnnotations.length} annotations`);
      } catch (error) {
        console.error("Failed to load annotations:", error);
        setAnnotations({}); // Reset on error
      }
    },
    [annotationService]
  );

  // File selection
  const handleFileSelect = useCallback(
    async (file) => {
      if (!file) return;

      try {
        console.log(`Selecting file: ${file.path}`);
        setCurrentFile(file);

        // Load annotations for this file if available
        await loadAnnotations(file.path);

        // Remove redundant caching - we already have the file in IndexedDB
        // await OfflineService.cacheMarkdownFile(file);

        // Update access timestamp if storage service is available
        if (fileStorageService) {
          try {
            await fileStorageService.updateFileAccess(file.path);
          } catch (error) {
            console.error("Error updating file access timestamp:", error);
            // Non-critical error, can continue
          }
        }
      } catch (error) {
        console.error("Error selecting file:", error);
      }
    },
    [loadAnnotations, fileStorageService]
  );

  // Paragraph selection for annotations
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

  // Save annotation and track paragraphs
  const saveAnnotation = useCallback(async () => {
    if (!annotationService || !currentFile || selectedParagraphs.size === 0)
      return;

    try {
      console.log("Saving annotation...");
      const paragraphs = currentFile.content
        .split("\n\n")
        .filter((p) => p.trim());

      // Process each selected paragraph
      const promises = [];
      for (const paragraphIndex of selectedParagraphs) {
        const paragraphText = paragraphs[paragraphIndex];

        // Track paragraph for future reference
        promises.push(
          annotationService.trackParagraph(
            currentFile.path,
            paragraphText,
            paragraphIndex
          )
        );

        // Add annotation if there's text
        if (annotationText.trim()) {
          promises.push(
            annotationService.addAnnotation({
              articleId: currentFile.path,
              paragraphIndex,
              text: annotationText,
              type: "note",
            })
          );
        }
      }

      // Wait for all operations to complete
      await Promise.all(promises);

      // Reload annotations to show the new ones
      await loadAnnotations(currentFile.path);

      // Reset annotation state
      setSelectedParagraphs(new Set());
      setAnnotationText("");
      setIsAnnotating(false);

      console.log("Annotation saved successfully");
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

  // Online status handling
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

  // Provide the context value
  return (
    <AppContext.Provider
      value={{
        // State
        files,
        currentFile,
        isImporting,
        directoryHandle,
        annotations,
        selectedParagraphs,
        isAnnotating,
        annotationText,
        isSidebarVisible,
        isOnline,
        isInitialized,
        assetService,

        // Actions
        handleImport,
        handleFileSelect,
        handleParagraphClick,
        setAnnotationText,
        saveAnnotation,
        cancelAnnotation,
        setIsSidebarVisible,
        setIsImporting,
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

export default AppProvider;
