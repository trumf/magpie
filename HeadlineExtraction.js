/**
 * Extracts a display name from markdown content or filename
 * First tries to find an H1 headline in the content
 * Falls back to cleaning up the filename if no headline is found
 *
 * @param {string} content - Markdown content
 * @param {string} filename - Original filename or path
 * @returns {string} Display name to use
 */
export function extractDisplayName(content, filename) {
  // Try to extract the first H1 headline from the content
  if (content && content.trim().length > 0) {
    // Look for # at the beginning of a line, followed by a space and text
    const headlineMatch = content.match(/^#\s+(.+)$/m);
    if (headlineMatch && headlineMatch[1]) {
      return headlineMatch[1].trim();
    }
  }

  // Extract just the filename from the path (if it contains directories)
  const pathParts = filename.split("/");
  const filenameOnly = pathParts[pathParts.length - 1];

  // Remove Notion hash patterns - handles both directory hash and filename hash
  // Pattern 1: Directory hash pattern (e.g., "Finance 75604854049d4b4e95f5c72ed1a6b792/")
  let cleanName = filename.replace(/[^\/]+\s+[a-f0-9]{32}\//, "");

  // Pattern 2: Filename hash pattern (e.g., "Bästa aktiefonderna 2025... 1803c4fa8cc381a29fb8fac09ec0cd16.md")
  cleanName = cleanName.replace(/\s+[a-f0-9]{32}\.(md|MD)$/, "");

  // If cleaning was ineffective (didn't match patterns), fall back to removing just the extension
  if (cleanName === filename) {
    return filenameOnly.replace(/\.(md|MD)$/, "").trim();
  }

  return cleanName.trim();
}
