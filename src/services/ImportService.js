// services/ImportService.js
import JSZip from "jszip";
import {getAssetService} from "./AssetService";

class ImportService {
  constructor() {
    this.assetService = null;
    this.initPromise = null;
  }

  async initialize() {
    if (this.assetService) return this.assetService;

    if (this.initPromise) return this.initPromise;

    this.initPromise = getAssetService().then((service) => {
      this.assetService = service;
      return service;
    });

    return this.initPromise;
  }

  isDirectoryPickerSupported() {
    return "showDirectoryPicker" in window;
  }

  async processZipFile(file) {
    try {
      // Ensure assetService is initialized before proceeding
      await this.initialize();
      console.log("Processing ZIP file with AssetService:", this.assetService);

      // Load the ZIP file
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const files = [];
      const assetMap = {};

      // First pass: identify and store assets
      console.log("ImportService: First pass - identifying assets");

      // Process assets in batches to prevent overwhelming IndexedDB
      const chunkSize = 10;
      const assetEntries = [];

      // Collect all asset entries
      for (const [path, entry] of Object.entries(zipContent.files)) {
        if (entry.dir) continue;

        const fileName = path.split("/").pop();

        // Skip hidden files
        if (fileName.startsWith(".")) continue;

        // Process non-markdown files as assets
        if (!fileName.endsWith(".md")) {
          assetEntries.push({path, entry, fileName});
        }
      }

      // Process assets in chunks
      console.log(
        `Processing ${assetEntries.length} assets in chunks of ${chunkSize}`
      );
      for (let i = 0; i < assetEntries.length; i += chunkSize) {
        const chunk = assetEntries.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async ({path, entry, fileName}) => {
          try {
            // Get blob data from ZIP entry
            const blob = await entry.async("blob");

            // Store asset and get ID
            const assetId = await this.assetService.storeAsset({
              blob,
              name: fileName,
              originalPath: path,
            });

            // Map both the full path and filename to the asset ID
            assetMap[path] = assetId;
            assetMap[fileName] = assetId;

            console.log(`Processed asset: ${fileName}`);
          } catch (error) {
            console.error(`Error storing asset ${fileName}:`, error);
            // Continue with other assets
          }
        });

        // Wait for current chunk to complete before moving to next
        await Promise.all(chunkPromises);
        console.log(
          `Completed chunk ${i / chunkSize + 1} of ${Math.ceil(
            assetEntries.length / chunkSize
          )}`
        );
      }

      // Second pass: process markdown files with updated references
      console.log("ImportService: Second pass - processing markdown files");
      const markdownPromises = [];

      for (const [path, entry] of Object.entries(zipContent.files)) {
        if (entry.dir) continue;

        const fileName = path.split("/").pop();

        // Skip hidden files
        if (fileName.startsWith(".")) continue;

        if (fileName.endsWith(".md")) {
          markdownPromises.push(
            entry.async("string").then(async (content) => {
              try {
                // Process content to replace image references
                const processedContent =
                  this.assetService.processMarkdownContent(content, assetMap);

                // Determine parent directory for organization
                const parts = path.split("/");
                let parentDir =
                  parts.length > 1 ? parts[parts.length - 2] : null;

                files.push({
                  type: "file",
                  name: fileName,
                  path: path,
                  content: processedContent,
                  parentDir,
                });

                console.log(`Processed markdown: ${fileName}`);
              } catch (error) {
                console.error(`Error processing markdown ${fileName}:`, error);
                // Still add the file, just without processed content
                const parts = path.split("/");
                files.push({
                  type: "file",
                  name: fileName,
                  path: path,
                  content: content,
                  parentDir: parts.length > 1 ? parts[parts.length - 2] : null,
                });
              }
            })
          );
        }
      }

      // Process markdown files
      await Promise.all(markdownPromises);

      // Create directory entries for all subdirectories in the ZIP
      const directories = new Set();
      for (const [path] of Object.entries(zipContent.files)) {
        if (path.includes("/")) {
          const parts = path.split("/");
          // Add each directory level
          for (let i = 0; i < parts.length - 1; i++) {
            const dirPath = parts.slice(0, i + 1).join("/");
            directories.add(dirPath);
          }
        }
      }

      // Add directory entries to files array
      directories.forEach((dirPath) => {
        const dirName = dirPath.split("/").pop();
        const parentDir =
          dirPath.split("/").length > 1
            ? dirPath.split("/").slice(0, -1).join("/")
            : null;

        files.push({
          type: "directory",
          name: dirName,
          path: dirPath,
          children: [],
          parentDir,
        });
      });

      // Organize files into a tree structure
      console.log(
        `ImportService: Organizing ${files.length} files into tree structure`
      );
      return this.organizeFiles(files);
    } catch (error) {
      console.error("Fatal error processing ZIP:", error);
      throw new Error("Failed to process ZIP file: " + error.message);
    }
  }

  async processDirectory(dirHandle, path = "") {
    try {
      // Ensure assetService is initialized before proceeding
      await this.initialize();

      const files = [];
      const assetMap = {};

      // First pass: collect all files
      console.log("ImportService: Collecting files from directory");
      await this.collectFilesFromDirectory(dirHandle, path, files, assetMap);
      console.log(`Collected ${files.length} files from directory`);

      // Second pass: process markdown content
      console.log("ImportService: Processing markdown content");
      for (const file of files) {
        if (file.type === "file" && file.name.endsWith(".md") && file.content) {
          try {
            file.content = this.assetService.processMarkdownContent(
              file.content,
              assetMap
            );
          } catch (error) {
            console.error(`Error processing markdown ${file.name}:`, error);
            // Continue with original content
          }
        }
      }

      console.log("ImportService: Organizing files into tree structure");
      return this.organizeFiles(files);
    } catch (error) {
      console.error("Error processing directory:", error);
      throw error;
    }
  }

  async collectFilesFromDirectory(dirHandle, path, files, assetMap) {
    try {
      // Process in batches to prevent overwhelming the browser
      const entries = [];

      // Collect all entries first
      for await (const entry of dirHandle.values()) {
        entries.push(entry);
      }

      console.log(
        `Found ${entries.length} entries in directory ${path || "root"}`
      );

      // Process directories first to ensure proper structure
      const directories = entries.filter((entry) => entry.kind === "directory");
      const fileEntries = entries.filter((entry) => entry.kind === "file");

      // Add directory entries
      for (const entry of directories) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;

        files.push({
          type: "directory",
          name: entry.name,
          path: entryPath,
          children: [],
          handle: entry,
        });

        // Recursively process subdirectories
        await this.collectFilesFromDirectory(entry, entryPath, files, assetMap);
      }

      // Process files in batches
      const chunkSize = 10;
      for (let i = 0; i < fileEntries.length; i += chunkSize) {
        const chunk = fileEntries.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (entry) => {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;

            if (entry.name.endsWith(".md")) {
              try {
                const file = await entry.getFile();
                const content = await file.text();

                files.push({
                  type: "file",
                  name: entry.name,
                  path: entryPath,
                  content,
                  handle: entry,
                });
              } catch (error) {
                console.error(
                  `Error processing markdown file ${entry.name}:`,
                  error
                );
              }
            } else {
              try {
                // Process as asset
                const file = await entry.getFile();

                // Create blob from file
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], {
                  type: file.type || this.getMimeTypeFromFilename(entry.name),
                });

                // Store asset
                const assetId = await this.assetService.storeAsset({
                  blob,
                  name: entry.name,
                  originalPath: entryPath,
                });

                // Add to asset map
                assetMap[entryPath] = assetId;
                assetMap[entry.name] = assetId; // Also map by filename alone
              } catch (error) {
                console.error(`Error processing asset ${entry.name}:`, error);
              }
            }
          })
        );
      }
    } catch (error) {
      console.error(`Error collecting files from directory ${path}:`, error);
      throw error;
    }
  }

  getMimeTypeFromFilename(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  async processFiles(fileList) {
    await this.initialize();

    console.log(`Processing ${fileList.length} individual files`);
    const files = [];

    // Process in smaller batches
    const chunkSize = 5;
    for (let i = 0; i < fileList.length; i += chunkSize) {
      const chunk = Array.from(fileList).slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async (file) => {
        if (file.name.endsWith(".md")) {
          try {
            const content = await file.text();

            return {
              type: "file",
              name: file.name,
              path: file.name,
              content,
              handle: file,
            };
          } catch (error) {
            console.error(
              `ImportService: Error processing file ${file.name}:`,
              error
            );
            return null;
          }
        }
        return null;
      });

      const results = await Promise.all(chunkPromises);
      files.push(...results.filter(Boolean));

      console.log(
        `Processed chunk ${Math.ceil(i / chunkSize) + 1} of ${Math.ceil(
          fileList.length / chunkSize
        )}`
      );
    }

    console.log(`Successfully processed ${files.length} markdown files`);
    return this.organizeFiles(files);
  }

  organizeFiles(files) {
    console.log("ImportService: Organizing files");
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

    console.log("ImportService: Files organized successfully");
    return this.sortEntries(root);
  }

  sortEntries(entries) {
    // Sort entries: directories first, then by name
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}

// Create an instance and export it
const importService = new ImportService();
export default importService;
