/**
 * MarkdownRendering.js
 * A module for rendering markdown content to HTML
 * Requires marked.js to be loaded: https://cdnjs.cloudflare.com/ajax/libs/marked/4.0.2/marked.min.js
 */

// CSS styles for rendered markdown
const markdownStyles = `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    color: #333;
}
.markdown-content {
    background-color: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    color: #2c3e50;
    line-height: 1.2;
}
h1 { font-size: 2.2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
h2 { font-size: 1.8em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
h3 { font-size: 1.5em; }
h4 { font-size: 1.3em; }
h5 { font-size: 1.2em; }
h6 { font-size: 1.1em; }
p {
    margin-bottom: 0.5em;
}
a { color: #0366d6; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    background-color: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 85%;
}
pre {
    background-color: #f6f8fa;
    border-radius: 3px;
    padding: 16px;
    overflow: auto;
}
pre code {
    background-color: transparent;
    padding: 0;
    font-size: 100%;
}
blockquote {
    margin: 0;
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
}
table th, table td {
    padding: 6px 13px;
    border: 1px solid #dfe2e5;
}
table th {
    background-color: #f6f8fa;
    font-weight: 600;
}
table tr:nth-child(2n) {
    background-color: #f6f8fa;
}
hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
}
ul, ol {
    padding-left: 2em;
}
img {
    max-width: 100%;
}`;

/**
 * Initialize the markdown renderer with options
 * @param {Array} zipFiles - Array of file objects from the current ZIP
 * @param {string} currentArticlePath - The path of the current article being rendered
 */
function initializeMarkdownRenderer(zipFiles = [], currentArticlePath = "") {
  // Make sure marked is available
  if (typeof marked === "undefined") {
    console.error("Marked.js library is required but not loaded");
    return false;
  }

  // Create renderer - handle different marked.js versions
  let renderer;
  try {
    // Try newer API first (marked v5+)
    if (typeof marked.Renderer === "function") {
      renderer = new marked.Renderer();
    } else if (typeof marked.marked?.Renderer === "function") {
      renderer = new marked.marked.Renderer();
    } else {
      // Fallback - create a minimal renderer object
      renderer = {
        image: function (href, title, text) {
          return `<img src="${href}" alt="${text}" ${
            title ? `title="${title}"` : ""
          }>`;
        },
      };
    }
  } catch (error) {
    console.error("Error creating marked renderer:", error);
    // Create fallback renderer
    renderer = {
      image: function (href, title, text) {
        return `<img src="${href}" alt="${text}" ${
          title ? `title="${title}"` : ""
        }>`;
      },
    };
  }

  const originalImageRenderer = renderer.image
    ? renderer.image.bind(renderer)
    : function (href, title, text) {
        return `<img src="${href}" alt="${text}" ${
          title ? `title="${title}"` : ""
        }>`;
      };

  renderer.image = (href, title, text) => {
    console.log(
      "[Custom Image Renderer] Called with href:",
      href,
      "title:",
      title,
      "text:",
      text
    );

    const decodedHref = decodeURIComponent(href);
    console.log("[Custom Image Renderer] decodedHref:", decodedHref);

    if (
      decodedHref &&
      !decodedHref.startsWith("http://") &&
      !decodedHref.startsWith("https://") &&
      !decodedHref.startsWith("data:")
    ) {
      let resolvedPathAttempt = "";
      try {
        const articleDir = currentArticlePath.substring(
          0,
          currentArticlePath.lastIndexOf("/") + 1
        );
        const url = new URL(decodedHref, `file:///${articleDir}`);
        resolvedPathAttempt = decodeURIComponent(
          url.pathname.startsWith("/")
            ? url.pathname.substring(1)
            : url.pathname
        );
        resolvedPathAttempt = resolvedPathAttempt.replace(/\\\\/g, "/");
        console.log(
          "[Custom Image Renderer] resolvedPathAttempt:",
          resolvedPathAttempt
        );
      } catch (e) {
        console.error("[Custom Image Renderer] Error resolving image path:", e);
        resolvedPathAttempt = decodedHref.replace(/\\\\/g, "/");
      }

      // Debug: Check all matching files
      const matchingFiles = zipFiles.filter((f) => {
        const normalizedFilePath = f.path.replace(/\\\\/g, "/");
        return normalizedFilePath === resolvedPathAttempt;
      });
      console.log("[Custom Image Renderer] Matching files:", matchingFiles);

      const imageFile = zipFiles.find((f) => {
        const normalizedFilePath = f.path.replace(/\\\\/g, "/");
        return normalizedFilePath === resolvedPathAttempt;
      });

      console.log("[Custom Image Renderer] Found imageFile:", imageFile);
      if (imageFile) {
        console.log(
          "[Custom Image Renderer] imageFile.isImage:",
          imageFile.isImage
        );
        console.log(
          "[Custom Image Renderer] imageFile.content type:",
          typeof imageFile.content
        );
        console.log(
          "[Custom Image Renderer] imageFile.content instanceof ArrayBuffer:",
          imageFile.content instanceof ArrayBuffer
        );
        console.log(
          "[Custom Image Renderer] imageFile.mimeType:",
          imageFile.mimeType
        );
      }

      // Handle both old and new formats
      let isValidImage = false;
      let imageContent = null;
      let mimeType = null;

      if (imageFile) {
        // New format: has isImage property
        if (
          imageFile.isImage === true &&
          imageFile.content instanceof ArrayBuffer
        ) {
          isValidImage = true;
          imageContent = imageFile.content;
          mimeType = imageFile.mimeType;
        }
        // Old format: detect by file extension and content is string
        else if (typeof imageFile.content === "string") {
          const lowerPath = imageFile.path.toLowerCase();
          const imageExtensions = [
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".svg",
            ".webp",
          ];
          const isImageByExtension = imageExtensions.some((ext) =>
            lowerPath.endsWith(ext)
          );

          if (isImageByExtension) {
            console.log(
              "[Custom Image Renderer] Detected old format image, converting to ArrayBuffer"
            );
            isValidImage = true;

            // Convert string to ArrayBuffer (assume it's binary data stored as string)
            const stringContent = imageFile.content;
            const arrayBuffer = new ArrayBuffer(stringContent.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < stringContent.length; i++) {
              uint8Array[i] = stringContent.charCodeAt(i);
            }
            imageContent = arrayBuffer;

            // Determine MIME type from extension
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
          }
        }
      }

      if (isValidImage && imageContent) {
        console.log(
          "[Custom Image Renderer] Found image file:",
          imageFile.path
        );
        try {
          // Create a Blob from the ArrayBuffer
          const blob = new Blob([imageContent], {
            type: mimeType,
          });
          // Create an Object URL
          const objectURL = URL.createObjectURL(blob);
          console.log("[Custom Image Renderer] Created object URL:", objectURL);
          return `<img src="${objectURL}" alt="${text}" ${
            title ? `title="${title}"` : ""
          }>`;
        } catch (error) {
          console.error(
            "[Custom Image Renderer] Error creating object URL:",
            error
          );
        }
      } else {
        if (imageFile) {
          console.warn(
            "[Custom Image Renderer] Image file found but not valid format. isValidImage:",
            isValidImage,
            "contentType:",
            typeof imageFile.content,
            "path:",
            imageFile.path
          );
        } else {
          console.warn(
            "[Custom Image Renderer] Image file not found:",
            resolvedPathAttempt
          );
        }
      }

      // Fallback
      return `<img src="${href}" alt="Image not found: ${text}" ${
        title ? `title="${title}"` : ""
      }>`;
    }

    // For absolute URLs, use original renderer
    return originalImageRenderer(href, title, text);
  };

  // Set up the Markdown renderer with options - handle different marked.js versions
  try {
    const options = {
      renderer, // Use the custom renderer
      breaks: true, // Convert line breaks to <br>
      gfm: true, // GitHub flavored markdown
      headerIds: true,
      highlight: function (code, lang) {
        return code;
      },
    };

    if (typeof marked.setOptions === "function") {
      marked.setOptions(options);
    } else if (typeof marked.marked?.setOptions === "function") {
      marked.marked.setOptions(options);
    }
    // If setOptions is not available, we'll pass options to parse() directly
  } catch (error) {
    console.warn("Could not set marked options:", error);
  }

  return true;
}

/**
 * Render markdown content to HTML
 * @param {string} markdown - The markdown content to render
 * @param {Array} zipFiles - Array of file objects from the current ZIP
 * @param {string} currentArticlePath - The path of the current article
 * @returns {string} The rendered HTML
 */
function renderMarkdown(markdown, zipFiles, currentArticlePath) {
  try {
    if (!initializeMarkdownRenderer(zipFiles, currentArticlePath)) {
      throw new Error("Markdown renderer not initialized");
    }

    // Handle different marked.js versions for parsing
    if (typeof marked.parse === "function") {
      return marked.parse(markdown);
    } else if (typeof marked.marked?.parse === "function") {
      return marked.marked.parse(markdown);
    } else if (typeof marked === "function") {
      // Very old versions where marked is directly callable
      return marked(markdown);
    } else {
      throw new Error("Cannot find marked parse function");
    }
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return `<p>Error rendering markdown: ${error.message}</p>`;
  }
}

/**
 * Apply markdown styles to the document
 * @param {string} containerId - Optional ID of container to style (if not provided, styles will be applied globally)
 * @returns {HTMLStyleElement} The created style element
 */
function applyMarkdownStyles(containerId) {
  const styleElement = document.createElement("style");

  if (containerId) {
    // Scope styles to the specific container
    styleElement.textContent = markdownStyles
      .replace(/body/g, `#${containerId}`)
      .replace(/\.markdown-content/g, `#${containerId}`)
      .replace(
        /h1, h2, h3, h4, h5, h6/g,
        `#${containerId} h1, #${containerId} h2, #${containerId} h3, #${containerId} h4, #${containerId} h5, #${containerId} h6`
      )
      .replace(/h1 \{/g, `#${containerId} h1 {`)
      .replace(/h2 \{/g, `#${containerId} h2 {`)
      .replace(/h3 \{/g, `#${containerId} h3 {`)
      .replace(/h4 \{/g, `#${containerId} h4 {`)
      .replace(/h5 \{/g, `#${containerId} h5 {`)
      .replace(/h6 \{/g, `#${containerId} h6 {`)
      .replace(/a \{/g, `#${containerId} a {`)
      .replace(/a:hover \{/g, `#${containerId} a:hover {`)
      .replace(/code \{/g, `#${containerId} code {`)
      .replace(/pre \{/g, `#${containerId} pre {`)
      .replace(/pre code \{/g, `#${containerId} pre code {`)
      .replace(/blockquote \{/g, `#${containerId} blockquote {`)
      .replace(/table \{/g, `#${containerId} table {`)
      .replace(
        /table th, table td \{/g,
        `#${containerId} table th, #${containerId} table td {`
      )
      .replace(/table th \{/g, `#${containerId} table th {`)
      .replace(
        /table tr:nth-child\(2n\) \{/g,
        `#${containerId} table tr:nth-child(2n) {`
      )
      .replace(/hr \{/g, `#${containerId} hr {`)
      .replace(/ul, ol \{/g, `#${containerId} ul, #${containerId} ol {`)
      .replace(/img \{/g, `#${containerId} img {`);
  } else {
    styleElement.textContent = markdownStyles;
  }

  document.head.appendChild(styleElement);
  return styleElement;
}

/**
 * Render markdown to a DOM element
 * @param {string} markdown - The markdown content to render
 * @param {string|HTMLElement} targetElement - The element ID or DOM element to render to
 * @param {boolean} applyStyles - Whether to apply default markdown styles
 * @param {Array} zipFiles - Array of file objects from the current ZIP (passed to renderMarkdown)
 * @param {string} currentArticlePath - The path of the current article (passed to renderMarkdown)
 */
function renderMarkdownToElement(
  markdown,
  targetElement,
  applyStyles = true,
  zipFiles,
  currentArticlePath
) {
  let element;

  if (typeof targetElement === "string") {
    element = document.getElementById(targetElement);
    if (!element) {
      console.error(`Element with ID '${targetElement}' not found`);
      return;
    }
  } else if (targetElement instanceof HTMLElement) {
    element = targetElement;
  } else {
    console.error("Invalid target element");
    return;
  }

  if (applyStyles) {
    element.classList.add("markdown-content");
    if (element.id) {
      applyMarkdownStyles(element.id);
    } else {
      // Create an ID if one doesn't exist
      const id = "markdown-" + Math.random().toString(36).substring(2, 9);
      element.id = id;
      applyMarkdownStyles(id);
    }
  }

  element.innerHTML = renderMarkdown(markdown, zipFiles, currentArticlePath);
}

/**
 * Load markdown from a URL and render it to an element
 * @param {string} url - The URL of the markdown file
 * @param {string|HTMLElement} targetElement - The element ID or DOM element to render to
 * @param {boolean} applyStyles - Whether to apply default markdown styles
 * @returns {Promise} A promise that resolves when the markdown is loaded and rendered
 */
function loadAndRenderMarkdownFromUrl(url, targetElement, applyStyles = true) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load markdown from ${url}: ${response.status} ${response.statusText}`
        );
      }
      return response.text();
    })
    .then((markdown) => {
      renderMarkdownToElement(markdown, targetElement, applyStyles);
    })
    .catch((error) => {
      console.error("Error loading markdown:", error);
      if (typeof targetElement === "string") {
        const element = document.getElementById(targetElement);
        if (element) {
          element.innerHTML = `<p>Error loading markdown: ${error.message}</p>`;
        }
      } else if (targetElement instanceof HTMLElement) {
        targetElement.innerHTML = `<p>Error loading markdown: ${error.message}</p>`;
      }
    });
}

/**
 * Handle file upload and render markdown from the file
 * @param {File} file - The file object containing markdown
 * @param {string|HTMLElement} targetElement - The element ID or DOM element to render to
 * @param {boolean} applyStyles - Whether to apply default markdown styles
 * @returns {Promise} A promise that resolves when the markdown is loaded and rendered
 */
function renderMarkdownFromFile(file, targetElement, applyStyles = true) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      renderMarkdownToElement(content, targetElement, applyStyles);
      resolve();
    };
    reader.onerror = function (e) {
      reject(new Error("Error reading file"));
    };
    reader.readAsText(file);
  });
}

/**
 * Get the markdown styles as a string
 * @returns {string} The markdown styles
 */
function getMarkdownStyles() {
  return markdownStyles;
}

// Export the module's public API
export {
  renderMarkdown,
  renderMarkdownToElement,
  loadAndRenderMarkdownFromUrl,
  renderMarkdownFromFile,
  applyMarkdownStyles,
  getMarkdownStyles,
  initializeMarkdownRenderer,
};
