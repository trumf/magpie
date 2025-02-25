// services/ImportService.js
import JSZip from "jszip";
import {getAssetService} from "./AssetService";

class ImportService {
  constructor() {
    this.assetService = null;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) return this.initPromise;

    console.log("ImportService: Starting initialization");

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        this.assetService = await getAssetService();
        console.log("ImportService: AssetService initialized successfully");
        resolve();
      } catch (error) {
        console.error(
          "ImportService: Failed to initialize AssetService",
          error
        );
        reject(error);
      }
    });

    return this.initPromise;
  }

  isDirectoryPickerSupported() {
    return "showDirectoryPicker" in window;
  }

  async processZipFile(file) {
    console.log("ImportService: Processing ZIP file", file.name);

    // Ensure assetService is initialized
    if (!this.assetService) {
      console.log(
        "ImportService: AssetService not initialized, initializing now"
      );
      await this.initialize();

      if (!this.assetService) {
        throw new Error("Failed to initialize AssetService");
      }
    }

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const files = [];
    const assetMap = {};

    // First pass: identify and store assets
    console.log("ImportService: First pass - identifying assets");
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
            try {
              console.log(`ImportService: Processing asset: ${path}`);
              const assetId = await this.assetService.storeAsset({
                blob,
                name: fileName,
                originalPath: path,
              });

              assetMap[path] = assetId;
              assetMap[fileName] = assetId; // Also map by filename alone
              console.log(
                `ImportService: Asset processed successfully: ${path} -> ${assetId}`
              );
            } catch (error) {
              console.error(
                `ImportService: Error processing asset ${path}:`,
                error
              );
              // Continue processing other assets even if one fails
            }
          })
        );
      }
    }

    // Wait for all assets to be processed
    console.log("ImportService: Waiting for all assets to be processed");
    await Promise.all(assetPromises).catch((error) => {
      console.error("ImportService: Error in asset processing:", error);
      // Continue processing even if some assets fail
    });

    // Second pass: process markdown files with updated references
    console.log("ImportService: Second pass - processing markdown files");
    const markdownPromises = [];

    for (const [path, entry] of Object.entries(zipContent.files)) {
      if (entry.dir) continue;

      const fileName = path.split("/").pop();

      if (fileName.endsWith(".md")) {
        markdownPromises.push(
          entry.async("string").then(async (content) => {
            try {
              console.log(`ImportService: Processing markdown: ${path}`);
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
              console.log(
                `ImportService: Markdown processed successfully: ${path}`
              );
            } catch (error) {
              console.error(
                `ImportService: Error processing markdown ${path}:`,
                error
              );
              // Add the file anyway without processed content
              const pathParts = path.split("/");
              files.push({
                type: "file",
                name: fileName,
                path: path,
                content: content,
                parentDir:
                  pathParts.length > 1 ? pathParts[pathParts.length - 2] : null,
                error: error.message,
              });
            }
          })
        );
      }
    }

    console.log(
      "ImportService: Waiting for all markdown files to be processed"
    );
    await Promise.all(markdownPromises).catch((error) => {
      console.error("ImportService: Error in markdown processing:", error);
      // Continue organizing files even if some markdown fails
    });

    // Organize files into a tree structure
    console.log("ImportService: Organizing files into tree structure");
    return this.organizeFiles(files);
  }

  async processDirectory(dirHandle, path = "") {
    console.log("ImportService: Processing directory", path || "root");

    // Ensure assetService is initialized
    if (!this.assetService) {
      console.log(
        "ImportService: AssetService not initialized, initializing now"
      );
      await this.initialize();

      if (!this.assetService) {
        throw new Error("Failed to initialize AssetService");
      }
    }

    const files = [];
    const assetMap = {};

    // First pass: collect all files
    console.log("ImportService: Collecting files from directory");
    await this.collectFilesFromDirectory(dirHandle, path, files, assetMap);

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
          console.error(
            `ImportService: Error processing markdown ${file.path}:`,
            error
          );
          // Keep original content if processing fails
        }
      }
    }

    console.log("ImportService: Organizing files into tree structure");
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
          try {
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
          } catch (error) {
            console.error(
              `ImportService: Error processing asset ${entryPath}:`,
              error
            );
            // Continue with other files
          }
        }
      }
    }
  }

  async processFiles(fileList) {
    console.log("ImportService: Processing files");

    // Ensure assetService is initialized
    if (!this.assetService) {
      console.log(
        "ImportService: AssetService not initialized, initializing now"
      );
      await this.initialize();
    }

    const files = [];

    for (const file of fileList) {
      if (file.name.endsWith(".md")) {
        try {
          files.push({
            type: "file",
            name: file.name,
            path: file.name,
            content: await file.text(),
            handle: file,
          });
        } catch (error) {
          console.error(
            `ImportService: Error processing file ${file.name}:`,
            error
          );
          // Continue with other files
        }
      }
    }

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
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }
}

let instance = null;

export const getImportService = async () => {
  if (!instance) {
    instance = new ImportService();
    await instance.initialize();
  }
  return instance;
};

const importServiceInstance = new ImportService();
export default importServiceInstance;
