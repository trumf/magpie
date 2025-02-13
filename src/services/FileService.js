// services/FileService.js
class FileService {
  async processFiles(files) {
    const results = [];

    for (const file of files) {
      if (file.name.endsWith(".md")) {
        try {
          const content = await file.text();
          console.log(`Processing file ${file.name}:`, {
            hasContent: !!content,
            contentLength: content?.length,
          });

          results.push({
            name: file.name,
            path: file.name,
            content,
            type: "file",
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
    }

    return this.organizeFiles(results);
  }

  async scanDirectory(handle, path = "", results = []) {
    console.log("Scanning directory:", path);
    for await (const entry of handle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        const newHandle = await handle.getDirectoryHandle(entry.name);
        await this.scanDirectory(newHandle, entryPath, results);
      } else if (entry.name.endsWith(".md")) {
        const file = await entry.getFile();
        const content = await file.text();
        results.push({
          name: entry.name,
          path: entryPath,
          content,
          type: "file",
          handle: entry,
        });
      }
    }
  }

  organizeFiles(files) {
    const root = [];
    const directories = new Map();

    files.forEach((file) => {
      const parts = file.path.split("/");
      let currentLevel = root;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          currentLevel.push(file);
        } else {
          let dir = directories.get(part);
          if (!dir) {
            dir = {
              name: part,
              type: "directory",
              children: [],
            };
            directories.set(part, dir);
            currentLevel.push(dir);
          }
          currentLevel = dir.children;
        }
      });
    });

    return root;
  }

  // Method to handle directory selection
  async handleDirectorySelect() {
    try {
      const handle = await window.showDirectoryPicker();
      return this.processDirectory(handle);
    } catch (error) {
      console.error("Error selecting directory:", error);
      throw error;
    }
  }

  async processDirectory(handle, path = "") {
    console.log("Processing directory:", {handle, path});
    const files = [];

    try {
      await this.scanDirectory(handle, "", files);
      console.log(
        "Processed files:",
        files.map((f) => ({
          name: f.name,
          hasContent: !!f.content,
        }))
      );

      return this.organizeFiles(files);
    } catch (error) {
      console.error("Error processing directory:", error);
      throw error;
    }
  }
}

export default new FileService();
