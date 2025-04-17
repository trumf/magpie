/**
 * htmlGenerator.js
 *
 * Module for generating HTML content related to ZIP files and displaying status messages.
 */

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.23 KB")
 */
export function formatSize(bytes) {
  if (bytes < 1024) {
    return bytes + " bytes";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
}

/**
 * Generate HTML content to display ZIP files
 * @param {Array} zipFiles - Array of ZIP file objects
 * @returns {string} HTML content
 */
export function generateZipFilesHtml(zipFiles) {
  if (!zipFiles || zipFiles.length === 0) {
    return "<p>No ZIP files stored in the database.</p>";
  }

  let html = "<table>";
  html +=
    "<tr><th>ID</th><th>Name</th><th>Size</th><th>Files</th><th>Timestamp</th></tr>";

  for (const zipFile of zipFiles) {
    html += `
        <tr>
          <td>${zipFile.id}</td>
          <td>${zipFile.name}</td>
          <td>${formatSize(zipFile.size)}</td> 
          <td>${zipFile.fileCount}</td>
          <td>${new Date(zipFile.timestamp).toLocaleString()}</td>
        </tr>
      `;
  }

  html += "</table>";

  // Add file details for the most recent upload (optional enhancement)
  // Consider if this detail should be part of this generic function
  // or handled separately where it's used.
  // For now, keeping it as per the original logic.
  const mostRecent = zipFiles[zipFiles.length - 1];
  if (mostRecent && mostRecent.files) {
    html += `<h3>Content of ${mostRecent.name} (showing ${mostRecent.files.length} files)</h3>`;
    html += "<pre>";

    mostRecent.files.forEach((file, index) => {
      // Limit preview to avoid overloading the UI
      const MAX_PREVIEW_FILES = 10;
      if (index < MAX_PREVIEW_FILES) {
        html += `<strong>${file.path}</strong> (${formatSize(file.size)}):
`;
        // Limit content preview length as well if necessary
        const MAX_CONTENT_PREVIEW = 500;
        const previewContent =
          file.content.length > MAX_CONTENT_PREVIEW
            ? file.content.substring(0, MAX_CONTENT_PREVIEW) + "..."
            : file.content;
        html += `${previewContent}\n\n`;
      }
    });

    if (mostRecent.files.length > 10) {
      html += `... and ${mostRecent.files.length - 10} more files`;
    }

    html += "</pre>";
  }

  return html;
}

/**
 * Display status message either via callback or by updating a DOM element.
 * @param {string} type - The type of status (success, error, info)
 * @param {string} message - The message to display
 * @param {Function|null} statusCallback - Optional callback function (type, message) => {}
 * @param {HTMLElement|null} element - Optional DOM element to display status in
 * @param {number} duration - Optional duration to display message in element (ms)
 */
export function showStatus(
  type,
  message,
  statusCallback = null,
  element = null,
  duration = 5000
) {
  // If an element is provided, update its innerHTML
  if (element) {
    element.innerHTML = `<div class="status ${type}">${message}</div>`;

    // Clear status after specified duration
    setTimeout(() => {
      if (element.innerHTML.includes(message)) {
        // Avoid clearing unrelated content
        element.innerHTML = "";
      }
    }, duration);
  }
  // If no element but a status callback is provided, use it
  else if (statusCallback) {
    statusCallback(type, message);
  }
}
