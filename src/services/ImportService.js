// services/ImportService.js
import JSZip from "jszip";
import {getAssetService} from "./AssetService";

class ImportService {
  constructor() {
    this.assetService = null;
  }

  async initialize() {
    this.assetService = await getAssetService();
  }

  isDirectoryPickerSupported() {
    return "showDirectoryPicker" in window;
  }

  async processZipFile(file) {
    if (!this.assetService) {
      await this.initialize();
    }

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const files = [];
    const assetMap = {};

    // First pass: identify and store assets
    const assetPromises = [];

    for (const [path, entry] of Object.entries(zipContent.files)) {
      if (entry.dir) continue;

      const fileName = path.split("/").pop();

      // Skip hidden files
      if (fileName.startsWith(".")) continue;

      // Process non-markdown files as assets
      if (!fileName.endsWith(".md")) {
        assetPromises.push(
          entry.async("blob").then(async (blob) => {
            const assetId = await this.assetService.storeAsset({
              blob,
              name: fileName,
              originalPath: path,
            });

            assetMap[path] = assetId;
            assetMap[fileName] = assetId; // Also map by filename alone
          })
        );
      }
    }

    // Wait for all assets to be processed
    await Promise.all(assetPromises);

    // Second pass: process markdown files with updated references
    const markdownPromises = [];

    for (const [path, entry] of Object.entries(zipContent.files)) {
      if (entry.dir) continue;

      const fileName = path.split("/").pop();

      if (fileName.endsWith(".md")) {
        markdownPromises.push(
          entry.async("string").then(async (content) => {
            // Process content to replace image references
            const processedContent = this.assetService.processMarkdownContent(
              content,
              assetMap
            );

            // Determine parent directory for organization
            const parts = path.split("/");
            let parentDir = parts.length > 1 ? parts[parts.length - 2] : null;

            files.push({
              type: "file",
              name: fileName,
              path: path,
              content: processedContent,
              parentDir,
            });
          })
        );
      }
    }

    await Promise.all(markdownPromises);

    // Organize files into a tree structure
    return this.organizeFiles(files);
  }

  async processDirectory(dirHandle, path = "") {
    if (!this.assetService) {
      await this.initialize();
    }

    const files = [];
    const assetMap = {};

    // First pass: collect all files
    await this.collectFilesFromDirectory(dirHandle, path, files, assetMap);

    // Second pass: process markdown content
    for (const file of files) {
      if (file.type === "file" && file.name.endsWith(".md") && file.content) {
        file.content = this.assetService.processMarkdownContent(
          file.content,
          assetMap
        );
      }
    }

    return this.organizeFiles(files);
  }

  async collectFilesFromDirectory(dirHandle, path, files, assetMap) {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        files.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children: [],
          handle: entry,
        });

        await this.collectFilesFromDirectory(entry, entryPath, files, assetMap);
      } else {
        if (entry.name.endsWith(".md")) {
          const file = await entry.getFile();
          files.push({
            type: "file",
            name: entry.name,
            path: entryPath,
            content: await file.text(),
            handle: entry,
          });
        } else {
          // Process as asset
          const file = await entry.getFile();
          const blob = await file
            .arrayBuffer()
            .then((buffer) => new Blob([buffer], {type: file.type}));

          const assetId = await this.assetService.storeAsset({
            blob: new Blob([blob]),
            name: entry.name,
            originalPath: entryPath,
          });

          assetMap[entryPath] = assetId;
          assetMap[entry.name] = assetId; // Also map by filename alone
        }
      }
    }
  }

  async processFiles(fileList) {
    if (!this.assetService) {
      await this.initialize();
    }

    const files = [];

    for (const file of fileList) {
      if (file.name.endsWith(".md")) {
        files.push({
          type: "file",
          name: file.name,
          path: file.name,
          content: await file.text(),
          handle: file,
        });
      }
    }

    return this.organizeFiles(files);
  }

  organizeFiles(files) {
    const root = [];
    const dirMap = new Map();

    // Create directory entries
    files.forEach((file) => {
      if (file.type === "directory") {
        dirMap.set(file.path, file);
      }
    });

    // Organize files into tree
    files.forEach((file) => {
      if (file.type === "file") {
        const parts = file.path.split("/");

        if (parts.length === 1) {
          // File is at the root
          root.push(file);
        } else {
          // File is in a directory
          const dirPath = parts.slice(0, -1).join("/");

          if (dirMap.has(dirPath)) {
            const dir = dirMap.get(dirPath);
            dir.children = dir.children || [];
            dir.children.push(file);
          } else {
            // If parent directory doesn't exist, add to root
            root.push(file);
          }
        }
      }
    });

    // Add directories to root
    dirMap.forEach((dir) => {
      const parts = dir.path.split("/");

      if (parts.length === 1) {
        // Directory is at the root
        root.push(dir);
      } else {
        // Directory is in another directory
        const parentPath = parts.slice(0, -1).join("/");

        if (dirMap.has(parentPath) && parentPath !== dir.path) {
          const parentDir = dirMap.get(parentPath);
          parentDir.children = parentDir.children || [];
          parentDir.children.push(dir);
        } else {
          // If parent directory doesn't exist, add to root
          root.push(dir);
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
