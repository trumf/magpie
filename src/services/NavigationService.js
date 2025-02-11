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
}

export default new NavigationService();
