// src/services/ImportService.js
import JSZip from "jszip";

class ImportService {
  // Check if directory picker is supported
  isDirectoryPickerSupported() {
    return "showDirectoryPicker" in window;
  }

  // Process ZIP file
  async processZipFile(file) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const entries = {};
    const loadPromises = [];

    zipContent.forEach((path, entry) => {
      if (!entry.dir && path.endsWith(".md")) {
        loadPromises.push(
          entry.async("string").then((content) => {
            entries[path] = content;
          })
        );
      }
    });

    await Promise.all(loadPromises);
    return this.processEntries(entries);
  }

  // Process directory using File System Access API
  async processDirectory(dirHandle, path = "") {
    const entries = [];
    for await (const entry of dirHandle.values()) {
      const entryPath = `${path}/${entry.name}`;
      if (entry.kind === "directory") {
        const children = await this.processDirectory(entry, entryPath);
        entries.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children,
          handle: entry,
        });
      } else if (entry.name.endsWith(".md")) {
        const file = await entry.getFile();
        const content = await file.text();
        entries.push({
          type: "file",
          name: entry.name,
          path: entryPath,
          handle: entry,
          content,
        });
      }
    }
    return this.sortEntries(entries);
  }

  // Process individual files
  async processFiles(fileList) {
    const entries = [];
    for (const file of fileList) {
      if (file.name.endsWith(".md")) {
        const content = await file.text();
        entries.push({
          type: "file",
          name: file.name,
          path: file.name,
          content,
          handle: file,
        });
      }
    }
    return this.sortEntries(entries);
  }

  // Helper to process ZIP entries into our file structure
  processEntries(entries) {
    const processDirectory = (path = "") => {
      const dirFiles = [];
      const dirs = new Set();

      Object.keys(entries).forEach((filePath) => {
        if (filePath.startsWith(path)) {
          const relativePath = filePath.slice(path.length);
          const parts = relativePath.split("/");
          if (parts.length > 1) {
            dirs.add(parts[0]);
          } else if (filePath.endsWith(".md")) {
            dirFiles.push({
              type: "file",
              name: parts[0],
              path: filePath,
              content: entries[filePath],
            });
          }
        }
      });

      dirs.forEach((dir) => {
        const dirPath = path + dir + "/";
        const children = processDirectory(dirPath);
        if (children.length > 0) {
          dirFiles.push({
            type: "directory",
            name: dir,
            path: dirPath,
            children,
          });
        }
      });

      return this.sortEntries(dirFiles);
    };

    return processDirectory();
  }

  // Helper to sort entries (directories first, then alphabetically)
  sortEntries(entries) {
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Find the first markdown file in the hierarchy
  findFirstMarkdownFile(items) {
    for (const item of items) {
      if (item.type === "file") return item;
      if (item.type === "directory" && item.children) {
        const found = this.findFirstMarkdownFile(item.children);
        if (found) return found;
      }
    }
    return null;
  }
}

export default new ImportService();
