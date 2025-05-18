/**
 * fileStatusManager.js
 *
 * Module for managing file read status and sorting file lists.
 */

/**
 * Update a file's read status directly within the zipData object.
 * Does not interact with the database.
 * @param {Object} zipData - ZIP file data object containing a 'files' array.
 * @param {string} filePath - Path of the file to update within the zipData.
 * @param {boolean} isRead - Read status to set.
 * @returns {Object} The modified zipData object.
 */
export function updateFileReadStatus(zipData, filePath, isRead) {
  if (!zipData || !zipData.files) {
    return zipData;
  }

  const fileIndex = zipData.files.findIndex((file) => file.path === filePath);
  if (fileIndex !== -1) {
    if (isRead) {
      zipData.files[fileIndex].isRead = true;
      zipData.files[fileIndex].readDate = new Date().toISOString();
    } else {
      zipData.files[fileIndex].isRead = false;
      delete zipData.files[fileIndex].readDate;
    }
  }

  return zipData; // Return the modified object
}

/**
 * Check if a file is marked as read directly within the zipData object.
 * Does not interact with the database.
 * @param {Object} zipData - ZIP file data object containing a 'files' array.
 * @param {string} filePath - Path of the file to check within the zipData.
 * @returns {boolean} True if the file is marked as read, false otherwise.
 */
export function checkFileReadStatus(zipData, filePath) {
  if (!zipData || !zipData.files) {
    return false;
  }

  const file = zipData.files.find((file) => file.path === filePath);
  return file ? file.isRead === true : false;
}

/**
 * Sort files by their read/unread status with various sorting options.
 * Does not interact with the database.
 * @param {Array} files - The array of file objects to sort.
 * @param {string} sortOrder - The sort order ('unread_first', 'recency', or 'alphabet').
 * @returns {Array} The sorted array of files.
 */
export function sortFilesByReadStatus(files, sortOrder) {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }

  // Create a copy of the array to avoid modifying the original
  const filesCopy = [...files];

  switch (sortOrder) {
    case "unread_first":
      // Sort unread files first, then alphabetically within each group
      return filesCopy.sort((a, b) => {
        // If a is read and b is unread, b comes first
        if (a.isRead && !b.isRead) return 1;
        // If a is unread and b is read, a comes first
        if (!a.isRead && b.isRead) return -1;
        // Otherwise sort alphabetically by displayName if available, otherwise path
        return (a.displayName || a.path).localeCompare(b.displayName || b.path);
      });

    case "recency":
      // Sort by most recently read first, with unread files at the end
      return filesCopy.sort((a, b) => {
        // If both are read, sort by read date (most recent first)
        if (a.isRead && b.isRead) {
          return new Date(b.readDate) - new Date(a.readDate);
        }
        // If only a is read, it comes first
        if (a.isRead && !b.isRead) return -1;
        // If only b is read, it comes first
        if (!a.isRead && b.isRead) return 1;
        // If both are unread, sort alphabetically
        return (a.displayName || a.path).localeCompare(b.displayName || b.path);
      });

    case "alphabet":
    default:
      // Default to alphabetical sorting by displayName if available, otherwise path
      return filesCopy.sort((a, b) =>
        (a.displayName || a.path).localeCompare(b.displayName || b.path)
      );
  }
}
