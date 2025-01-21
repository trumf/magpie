// src/services/ImportService.js
import JSZip from "jszip";

class ImportService {
  // Check if directory picker is supported
  isDirectoryPickerSupported() {
    return "showDirectoryPicker" in window;
  }

  // Process ZIP file
  // In ImportService.js
  async processZipFile(file) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const entries = [];
    const loadPromises = [];

    // Helper to determine if file is an image
    const isImage = (filename) =>
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);

    // First collect all unique directories from file paths
    const directories = new Set();
    zipContent.forEach((path) => {
      const parts = path.split("/").slice(0, -1);
      let currentPath = "";
      parts.forEach((part) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        directories.add(currentPath);
      });
    });

    // Create directory entries
    directories.forEach((dirPath) => {
      const pathParts = dirPath.split("/");
      entries.push({
        type: "directory",
        name: pathParts[pathParts.length - 1] || dirPath,
        path: dirPath,
        children: [],
      });
    });

    // Process all files
    zipContent.forEach((path, entry) => {
      if (!entry.dir) {
        const pathParts = path.split("/");
        const fileName = pathParts[pathParts.length - 1];
        const fileEntry = {
          type: "file",
          name: fileName,
          path: path,
        };

        if (fileName.endsWith(".md")) {
          // Handle markdown files
          loadPromises.push(
            entry.async("string").then((content) => {
              fileEntry.content = content;
            })
          );
        } else if (isImage(fileName)) {
          // Handle image files
          loadPromises.push(
            entry.async("blob").then((blob) => {
              fileEntry.blob = blob;
              fileEntry.url = URL.createObjectURL(blob);
            })
          );
        }
        entries.push(fileEntry);
      }
    });

    // Wait for all markdown content to load
    await Promise.all(loadPromises);

    // Build directory tree
    const root = [];
    const dirMap = new Map();

    // First pass: create directory map
    entries.forEach((entry) => {
      if (entry.type === "directory") {
        dirMap.set(entry.path, entry);
      }
    });

    // Second pass: organize files and directories into tree
    entries.forEach((entry) => {
      const pathParts = entry.path.split("/").filter(Boolean);

      if (pathParts.length === 1) {
        root.push(entry);
      } else {
        const parentPath = pathParts.slice(0, -1).join("/");
        const parentDir = dirMap.get(parentPath);
        if (parentDir) {
          parentDir.children = parentDir.children || [];
          parentDir.children.push(entry);
        }
      }
    });

    // Sort all levels
    const sortEntries = (items) => {
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      items.forEach((item) => {
        if (item.type === "directory" && item.children) {
          sortEntries(item.children);
        }
      });
    };

    sortEntries(root);
    console.log("Processed ZIP structure:", root);

    return root;
  }

  // Process directory using File System Access API
  // In ImportService.js processDirectory method:
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
        console.log(
          "Added directory:",
          entry.name,
          "with children:",
          children.length
        );
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
        console.log("Added file:", entry.name);
      }
    }

    // Sort entries with files AND directories
    const sortedEntries = this.sortEntries(entries);
    console.log("Directory contents:", sortedEntries);
    return sortedEntries;
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
  async processDirectory(dirHandle, path = "") {
    const entries = [];

    for await (const entry of dirHandle.values()) {
      const entryPath = `${path}/${entry.name}`;

      if (entry.kind === "directory") {
        const subdirEntries = await this.processDirectory(entry, entryPath);
        entries.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children: subdirEntries,
          handle: entry,
        });
        console.log(
          `Added directory: ${entry.name} with children:`,
          subdirEntries.length
        );
      } else {
        // For all files (not just .md)
        const fileEntry = {
          type: "file",
          name: entry.name,
          path: entryPath,
          handle: entry,
        };

        // Only fetch content for markdown files
        if (entry.name.endsWith(".md")) {
          const file = await entry.getFile();
          fileEntry.content = await file.text();
        }

        entries.push(fileEntry);
        console.log(`Added file: ${entry.name}`);
      }
    }

    const sortedEntries = entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(
      `Directory ${path} contains:`,
      sortedEntries.map((e) => ({name: e.name, type: e.type}))
    );

    return sortedEntries;
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
