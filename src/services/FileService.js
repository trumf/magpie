// services/FileService.js
class FileService {
  async processFiles(files) {
    const results = [];

    for (const file of files) {
      if (file.name.endsWith(".md")) {
        const content = await file.text();
        results.push({
          name: file.name,
          path: file.name,
          content,
          type: "file",
        });
      }
    }

    return this.organizeFiles(results);
  }

  async processDirectory(handle) {
    const files = [];
    await this.scanDirectory(handle, "", files);
    return this.organizeFiles(files);
  }

  async scanDirectory(handle, path = "", results = []) {
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
}

export default new FileService();
