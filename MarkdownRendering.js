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
}
h1 { font-size: 2.2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
h2 { font-size: 1.8em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
h3 { font-size: 1.5em; }
h4 { font-size: 1.3em; }
h5 { font-size: 1.2em; }
h6 { font-size: 1.1em; }
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
 */
function initializeMarkdownRenderer() {
  // Make sure marked is available
  if (typeof marked === "undefined") {
    console.error("Marked.js library is required but not loaded");
    return false;
  }

  // Set up the Markdown renderer with options
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub flavored markdown
    headerIds: true,
    highlight: function (code, lang) {
      return code;
    },
  });

  return true;
}

/**
 * Render markdown content to HTML
 * @param {string} markdown - The markdown content to render
 * @returns {string} The rendered HTML
 */
function renderMarkdown(markdown) {
  try {
    if (!initializeMarkdownRenderer()) {
      throw new Error("Markdown renderer not initialized");
    }
    return marked.parse(markdown);
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
 */
function renderMarkdownToElement(markdown, targetElement, applyStyles = true) {
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

  element.innerHTML = renderMarkdown(markdown);
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
};
