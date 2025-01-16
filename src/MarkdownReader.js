import React, {useState} from "react";
import {Upload} from "lucide-react";
import FileExplorer from "./components/FileExplorer";
import "./styles/explorer.css";
import AnnotatedMarkdown from "./AnnotationMarkdown";

const MarkdownReader = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [directoryHandle, setDirectoryHandle] = useState(null);

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

  const handleFolderSelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      const processedFiles = await processDirectory(handle);
      setFiles(processedFiles);
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

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

  return (
    <div className="reader">
      {!directoryHandle && (
        <div className="reader__welcome">
          <button onClick={handleFolderSelect} className="reader__button">
            <Upload size={16} />
            Select Folder
          </button>
        </div>
      )}

      {directoryHandle && (
        <div className="reader__content">
          <FileExplorer files={files} onFileSelect={handleFileSelect} />
          <div className="reader__main">
            <div className="reader__view">
              {selectedFile ? (
                <AnnotatedMarkdown
                  content={fileContent}
                  articleId={selectedFile.path}
                  directoryHandle={directoryHandle}
                  filePath={selectedFile.path}
                />
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
