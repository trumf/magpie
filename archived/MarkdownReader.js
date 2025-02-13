import React, {useState} from "react";
import {Upload} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import AnnotatedMarkdown from "./AnnotationMarkdown";
import SwipeableArticle from "./components/SwipeableArticle";
import ImportUI from "./components/ImportUI"; // Add import
import "./styles/reader.css";

const MarkdownReader = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [importMode, setImportMode] = useState(true); // New state for controlling view

  const handleImportComplete = async (importedFiles, dirHandle) => {
    try {
      setFiles(importedFiles);
      if (dirHandle) {
        setDirectoryHandle(dirHandle);
      }
      setImportMode(false);
      // If we have files but no directory handle, we need to handle them differently
      if (!dirHandle && importedFiles.length > 0) {
        // Select the first file automatically
        await handleFileSelect(importedFiles[0]);
      }
    } catch (error) {
      console.error("Error completing import:", error);
    }
  };

  const handleFileSelect = async (file) => {
    try {
      if (file.content) {
        // If content is already loaded (ZIP file case)
        setSelectedFile(file);
        setFileContent(file.content);
      } else if (file.handle) {
        // Directory file case
        const fileData = await file.handle.getFile();
        const content = await fileData.text();
        setSelectedFile(file);
        setFileContent(content);
      } else {
        throw new Error("Invalid file entry");
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setFileContent("Error loading file content");
    }
  };

  const getAllFiles = (items) => {
    return items.reduce((acc, item) => {
      if (item.type === "file") {
        acc.push(item);
      } else if (item.children) {
        acc.push(...getAllFiles(item.children));
      }
      return acc;
    }, []);
  };

  const onNext = async () => {
    if (!selectedFile) return;
    const allFiles = getAllFiles(files);
    const currentIndex = allFiles.findIndex(
      (file) => file.path === selectedFile.path
    );
    if (currentIndex < allFiles.length - 1) {
      await handleFileSelect(allFiles[currentIndex + 1]);
    }
  };

  const onPrevious = async () => {
    if (!selectedFile) return;
    const allFiles = getAllFiles(files);
    const currentIndex = allFiles.findIndex(
      (file) => file.path === selectedFile.path
    );
    if (currentIndex > 0) {
      await handleFileSelect(allFiles[currentIndex - 1]);
    }
  };

  const allFiles = getAllFiles(files);
  const currentIndex = selectedFile
    ? allFiles.findIndex((file) => file.path === selectedFile.path)
    : -1;
  const hasNext = currentIndex < allFiles.length - 1 && currentIndex !== -1;
  const hasPrevious = currentIndex > 0;

  // Show ImportUI if in import mode and no directory handle
  if (importMode && !directoryHandle) {
    return <ImportUI onImportComplete={handleImportComplete} />;
  }

  return (
    <div className="reader">
      {importMode ? (
        <ImportUI onImportComplete={handleImportComplete} />
      ) : (
        <div className="reader__welcome">
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            onReset={() => {
              setImportMode(true);
              setFiles([]);
              setSelectedFile(null);
              setFileContent("");
              setDirectoryHandle(null);
            }}
          />

          <div className="reader__content">
            {selectedFile ? (
              <SwipeableArticle
                onNext={onNext}
                onPrevious={onPrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
              >
                <div className="reader__article">
                  <AnnotatedMarkdown
                    key={selectedFile.path}
                    content={fileContent}
                    articleId={selectedFile.path}
                    directoryHandle={directoryHandle}
                  />
                </div>
              </SwipeableArticle>
            ) : (
              <div className="reader__empty-state">
                Select a file to view its contents
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownReader;
