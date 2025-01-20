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
