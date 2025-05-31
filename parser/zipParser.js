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
 *                          { name, size, timestamp, fileCount, totalSize, files: [{ path, displayName, size, content, isImage, mimeType }] }
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
            const lowerPath = path.toLowerCase();
            const imageExtensions = [
              ".png",
              ".jpg",
              ".jpeg",
              ".gif",
              ".svg",
              ".webp",
            ];
            const isImage = imageExtensions.some((ext) =>
              lowerPath.endsWith(ext)
            );

            let content;
            let mimeType = null;

            if (isImage) {
              // Store images as ArrayBuffer for later Blob creation
              content = await zipEntry.async("arraybuffer");

              // Determine MIME type
              const extension = lowerPath.split(".").pop();
              switch (extension) {
                case "png":
                  mimeType = "image/png";
                  break;
                case "jpg":
                case "jpeg":
                  mimeType = "image/jpeg";
                  break;
                case "gif":
                  mimeType = "image/gif";
                  break;
                case "svg":
                  mimeType = "image/svg+xml";
                  break;
                case "webp":
                  mimeType = "image/webp";
                  break;
                default:
                  mimeType = "application/octet-stream";
              }
            } else {
              // Non-images as strings
              content = await zipEntry.async("string");
            }

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
              size: isImage ? content.byteLength : content.length,
              content: content,
              isImage: isImage,
              mimeType: mimeType,
            });
            totalSize += isImage ? content.byteLength : content.length;
          }
        }

        // Create ZIP data object
        const zipData = {
          name: file.name,
          size: file.size, // Original file size
          timestamp: new Date().toISOString(),
          fileCount: files.length,
          totalSize: totalSize, // Sum of extracted content sizes
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
