/**
 * zipParser.js
 *
 * Module for parsing ZIP file contents using FileReader and JSZip.
 */

import {extractDisplayName} from "../HeadlineExtraction.js";

/**
 * Parses a ZIP file and extracts its contents and metadata.
 * @param {File} file - The ZIP file to parse.
 * @returns {Promise<Object>} A promise that resolves with the zip data object:
 *                          { name, size, timestamp, fileCount, totalSize, files: [{ path, displayName, size, content }] }
 */
export async function parseZipFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        // Make sure JSZip is available
        if (typeof JSZip !== "function") {
          throw new Error(
            "JSZip library not found. Please include JSZip in your project."
          );
        }

        const arrayBuffer = event.target.result;
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(arrayBuffer);

        // Process ZIP contents
        const files = [];
        let totalSize = 0;

        for (const [path, zipEntry] of Object.entries(zip.files)) {
          if (!zipEntry.dir) {
            const content = await zipEntry.async("string");

            // Extract display name for markdown files
            let displayName = path;
            if (
              path.toLowerCase().endsWith(".md") ||
              path.toLowerCase().endsWith(".markdown")
            ) {
              displayName = extractDisplayName(content, path);
            }

            files.push({
              path,
              displayName,
              size: content.length, // Use content.length as size approximation
              content: content,
              // We don't store raw ArrayBuffer to avoid high memory usage
              // If needed later, it could be re-read or stored differently
            });
            totalSize += content.length;
          }
        }

        // Create ZIP data object
        const zipData = {
          name: file.name,
          size: file.size, // Original file size
          timestamp: new Date().toISOString(),
          fileCount: files.length,
          totalSize: totalSize, // Sum of extracted string content lengths
          files,
        };

        resolve(zipData);
      } catch (error) {
        console.error("Error processing zip file:", error);
        reject(error);
      }
    };

    reader.onerror = (event) => {
      console.error("Error reading file:", event.target.error);
      reject(event.target.error);
    };

    reader.readAsArrayBuffer(file);
  });
}
