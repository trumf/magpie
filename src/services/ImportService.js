// services/ImportService.js
import JSZip from "jszip";

class ImportService {
  isDirectoryPickerSupported() {
    return "showDirectoryPicker" in window;
  }

  async processZipFile(file) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const entries = [];
    const loadPromises = [];

    // Helper to determine if file is an image
    const isImage = (filename) =>
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);

    // Collect directories
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

    // Process files
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
          loadPromises.push(
            entry.async("string").then((content) => {
              fileEntry.content = content;
            })
          );
        } else if (isImage(fileName)) {
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

    await Promise.all(loadPromises);

    return this.organizeEntries(entries);
  }

  async processDirectory(dirHandle, path = "") {
    const entries = [];

    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        const children = await this.processDirectory(entry, entryPath);
        entries.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children,
          handle: entry,
        });
      } else {
        const fileEntry = {
          type: "file",
          name: entry.name,
          path: entryPath,
          handle: entry,
        };

        if (entry.name.endsWith(".md")) {
          const file = await entry.getFile();
          fileEntry.content = await file.text();
        }

        entries.push(fileEntry);
      }
    }

    return this.organizeEntries(entries);
  }

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
    return this.organizeEntries(entries);
  }

  organizeEntries(entries) {
    const root = [];
    const dirMap = new Map();

    // Create directory map
    entries.forEach((entry) => {
      if (entry.type === "directory") {
        dirMap.set(entry.path, entry);
      }
    });

    // Organize into tree
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

    return this.sortEntries(root);
  }

  sortEntries(entries) {
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}

export default new ImportService();
