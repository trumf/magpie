// services/NavigationService.js
class NavigationService {
  flattenFiles(files) {
    const flatten = (items) => {
      return items.reduce((flat, item) => {
        if (item.type === "directory") {
          return [...flat, ...flatten(item.children)];
        }
        return [...flat, item];
      }, []);
    };

    return flatten(files);
  }

  getNavigationState(files, currentPath) {
    const allFiles = this.flattenFiles(files);
    const currentIndex = currentPath
      ? allFiles.findIndex((f) => f.path === currentPath)
      : -1;

    const hasNext = currentIndex < allFiles.length - 1;
    const hasPrevious = currentIndex > 0;

    return {
      allFiles,
      currentIndex,
      hasNext,
      hasPrevious,
      nextFile: hasNext ? allFiles[currentIndex + 1] : null,
      previousFile: hasPrevious ? allFiles[currentIndex - 1] : null,
    };
  }

  getDisplayTitle(file) {
    if (!file) return "";

    if (file.type === "directory") {
      return file.name;
    }

    // Try to get H1 from content
    const h1Match = file.content?.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Fall back to cleaned filename
    return file.name.replace(/\s+[a-f0-9]{32}\.(md|MD)$/, "").trim();
  }
}

const navigationService = new NavigationService();
export default navigationService;
