import React, {useState} from "react";
import {Upload} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import AnnotatedMarkdown from "./AnnotationMarkdown";
import SwipeableArticle from "./components/SwipeableArticle";
import ImportUI from "./components/ImportUI"; // Add import

const MarkdownReader = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [importMode, setImportMode] = useState(true); // New state for controlling view

  /*
  const processDirectory = async (dirHandle, path = "") => {
    const entries = [];
    for await (const entry of dirHandle.values()) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.kind === "directory") {
        const children = await processDirectory(entry, entryPath);
        entries.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children,
          handle: entry,
        });
      } else if (entry.name.endsWith(".md")) {
        entries.push({
          type: "file",
          name: entry.name,
          path: entryPath,
          handle: entry,
        });
      }
    }
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };
  */

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

  /*
  const handleFolderSelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      // Use importService instead of local processDirectory
      const processedFiles = await importService.processDirectory(handle);
      setFiles(processedFiles);
      setSelectedFile(null);
      setFileContent("");
      setImportMode(false);
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };
  */

  const handleFileSelect = async (file) => {
    try {
      const fileHandle = file.handle;
      const fileData = await fileHandle.getFile();
      const content = await fileData.text();
      setSelectedFile(file);
      setFileContent(content);
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
        <div className="reader__content">
          <FileExplorer files={files} onFileSelect={handleFileSelect} />
          <div className="reader__main">
            <div className="reader__view">
              {selectedFile ? (
                <SwipeableArticle
                  onNext={onNext}
                  onPrevious={onPrevious}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                >
                  <AnnotatedMarkdown
                    key={selectedFile.path} // Add key prop to force remount
                    content={fileContent}
                    articleId={selectedFile.path}
                    directoryHandle={directoryHandle}
                  />
                </SwipeableArticle>
              ) : (
                <div className="reader__empty-state">
                  Select a file to view its contents
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownReader;
