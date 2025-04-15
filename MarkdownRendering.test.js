/**
 * Unit tests for MarkdownRendering.js
 */

// Import the functions to test
import {
  renderMarkdown,
  renderMarkdownToElement,
  loadAndRenderMarkdownFromUrl,
  renderMarkdownFromFile,
  applyMarkdownStyles,
  getMarkdownStyles,
} from "./MarkdownRendering.js";

// Mock the marked library with proper implementation
global.marked = {
  parse: function (markdown) {
    return `<p>${markdown}</p>`;
  },
  setOptions: function (options) {
    // Do nothing
  },
};

// Track function calls for verification
let parseCallArgs = [];
let setOptionsCallArgs = [];
let originalParseFunction = global.marked.parse;
let originalSetOptionsFunction = global.marked.setOptions;

// Override the functions to track calls
global.marked.parse = function () {
  parseCallArgs.push(Array.from(arguments));
  return originalParseFunction.apply(this, arguments);
};

global.marked.setOptions = function () {
  setOptionsCallArgs.push(Array.from(arguments));
  return originalSetOptionsFunction.apply(this, arguments);
};

describe("MarkdownRendering", () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear call tracking
    parseCallArgs = [];
    setOptionsCallArgs = [];

    // Reset the document body
    document.body.innerHTML = "";

    // Reset error spy if needed
    if (window.consoleErrorMessages) {
      window.consoleErrorMessages = [];
    }
  });

  // Custom error spy
  beforeAll(() => {
    // Setup spy for console.error
    window.consoleErrorMessages = [];
    const originalConsoleError = console.error;
    console.error = function () {
      window.consoleErrorMessages.push(Array.from(arguments).join(" "));
      originalConsoleError.apply(this, arguments);
    };
  });

  afterAll(() => {
    // Cleanup global modifications
    if (window.originalConsoleError) {
      console.error = window.originalConsoleError;
    }
  });

  describe("renderMarkdown", () => {
    it("should render markdown to HTML", () => {
      const result = renderMarkdown("Test markdown");
      expect(parseCallArgs.length).toBe(1);
      expect(parseCallArgs[0][0]).toBe("Test markdown");
      expect(result).toBe("<p>Test markdown</p>");
    });

    it("should handle errors when marked is not defined", () => {
      // Temporarily remove the marked object
      const originalMarked = global.marked;
      global.marked = undefined;

      const result = renderMarkdown("Test markdown");
      expect(result).toContain("Error rendering markdown");
      expect(
        window.consoleErrorMessages.some((msg) =>
          msg.includes("Marked.js library is required")
        )
      ).toBe(true);

      // Restore marked
      global.marked = originalMarked;
    });

    it("should handle errors during parsing", () => {
      // Override parse to throw an error
      const originalParse = global.marked.parse;
      global.marked.parse = function () {
        throw new Error("Parse error");
      };

      const result = renderMarkdown("Test markdown");
      expect(result).toBe("<p>Error rendering markdown: Parse error</p>");

      // Restore original function
      global.marked.parse = originalParse;
    });
  });

  describe("applyMarkdownStyles", () => {
    it("should create a style element and add it to the document", () => {
      const styleElement = applyMarkdownStyles();
      const foundStyle = document.head.querySelector("style");
      expect(foundStyle).not.toBe(null);
      expect(styleElement.textContent).toContain("font-family");
    });

    it("should scope styles to a container when containerId is provided", () => {
      const styleElement = applyMarkdownStyles("test-container");
      expect(styleElement.textContent).toContain("#test-container");
      expect(styleElement.textContent.includes("body {")).toBe(false);
      expect(styleElement.textContent).toContain("#test-container h1");
    });
  });

  describe("renderMarkdownToElement", () => {
    it("should render markdown to a DOM element by ID", () => {
      // Create test element
      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      renderMarkdownToElement("Test markdown", "test-div");

      expect(testDiv.innerHTML).toBe("<p>Test markdown</p>");
      expect(testDiv.classList.contains("markdown-content")).toBe(true);
    });

    it("should render markdown to a DOM element instance", () => {
      const testDiv = document.createElement("div");
      document.body.appendChild(testDiv);

      renderMarkdownToElement("Test markdown", testDiv);

      expect(testDiv.innerHTML).toBe("<p>Test markdown</p>");
    });

    it("should apply styles when applyStyles is true", () => {
      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      renderMarkdownToElement("Test markdown", testDiv, true);

      expect(document.head.querySelector("style")).not.toBe(null);
    });

    it("should not apply styles when applyStyles is false", () => {
      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      renderMarkdownToElement("Test markdown", testDiv, false);

      expect(testDiv.classList.contains("markdown-content")).toBe(false);
    });

    it("should handle errors for non-existent elements", () => {
      window.consoleErrorMessages = [];

      renderMarkdownToElement("Test markdown", "non-existent-element");

      expect(
        window.consoleErrorMessages.some((msg) =>
          msg.includes("Element with ID 'non-existent-element' not found")
        )
      ).toBe(true);
    });

    it("should handle invalid target element", () => {
      window.consoleErrorMessages = [];

      renderMarkdownToElement("Test markdown", null);

      expect(
        window.consoleErrorMessages.some((msg) =>
          msg.includes("Invalid target element")
        )
      ).toBe(true);
    });

    it("should generate an ID when element has none", () => {
      const testDiv = document.createElement("div");
      document.body.appendChild(testDiv);

      renderMarkdownToElement("Test markdown", testDiv);

      expect(testDiv.id).not.toBe("");
    });
  });

  describe("loadAndRenderMarkdownFromUrl", () => {
    let originalFetch;

    beforeEach(() => {
      // Track fetch calls
      window.fetchCalls = [];
      originalFetch = window.fetch;
    });

    afterEach(() => {
      // Restore fetch
      window.fetch = originalFetch;
    });

    it("should fetch markdown from URL and render it", async () => {
      // Setup fetch mock
      window.fetch = function (url) {
        window.fetchCalls.push(url);
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("# Markdown from URL"),
        });
      };

      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      await loadAndRenderMarkdownFromUrl("http://example.com/test.md", testDiv);

      expect(window.fetchCalls.includes("http://example.com/test.md")).toBe(
        true
      );
      expect(testDiv.innerHTML).toBe("<p># Markdown from URL</p>");
    });

    it("should handle fetch errors", async () => {
      // Setup fetch mock for error
      window.fetch = function () {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });
      };

      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      await loadAndRenderMarkdownFromUrl(
        "http://example.com/notfound.md",
        testDiv
      );

      expect(testDiv.innerHTML.includes("Error loading markdown")).toBe(true);
    });

    it("should handle network errors", async () => {
      // Setup fetch mock to reject
      window.fetch = function () {
        return Promise.reject(new Error("Network error"));
      };

      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      await loadAndRenderMarkdownFromUrl("http://example.com/test.md", testDiv);

      expect(testDiv.innerHTML.includes("Error loading markdown")).toBe(true);
    }, 10000); // Increase timeout
  });

  describe("renderMarkdownFromFile", () => {
    it("should read file and render markdown content", (done) => {
      // Create a mock file with content
      const testFile = {
        name: "test.md",
        content: "# File Markdown",
      };

      // Create a mock FileReader that triggers onload immediately
      class MockFileReader {
        constructor() {
          this.result = null;
          this.onload = null;
        }

        readAsText(file) {
          this.result = file.content;
          // Use setTimeout to make this async
          setTimeout(() => {
            if (this.onload) {
              this.onload({target: {result: file.content}});
            }
          }, 0);
        }
      }

      // Save original and replace
      const originalFileReader = window.FileReader;
      window.FileReader = MockFileReader;

      const testDiv = document.createElement("div");
      testDiv.id = "test-div";
      document.body.appendChild(testDiv);

      renderMarkdownFromFile(testFile, testDiv)
        .then(() => {
          expect(testDiv.innerHTML).toBe("<p># File Markdown</p>");
          // Restore original
          window.FileReader = originalFileReader;
          done();
        })
        .catch((e) => {
          // Restore original
          window.FileReader = originalFileReader;
          done(e);
        });
    }, 10000); // Increase timeout

    it("should reject if no file is provided", async () => {
      const testDiv = document.createElement("div");

      try {
        await renderMarkdownFromFile(null, testDiv);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe("No file provided");
      }
    });

    it("should handle FileReader errors", (done) => {
      // Create a mock FileReader that triggers onerror immediately
      class MockFileReader {
        constructor() {
          this.onerror = null;
        }

        readAsText() {
          // Use setTimeout to make this async
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error("Read error"));
            }
          }, 0);
        }
      }

      // Save original and replace
      const originalFileReader = window.FileReader;
      window.FileReader = MockFileReader;

      const testFile = {name: "test.md"};
      const testDiv = document.createElement("div");

      renderMarkdownFromFile(testFile, testDiv)
        .then(() => {
          // Should not reach here
          window.FileReader = originalFileReader;
          done(new Error("Should have rejected"));
        })
        .catch((error) => {
          expect(error.message).toBe("Error reading file");
          // Restore original
          window.FileReader = originalFileReader;
          done();
        });
    }, 10000); // Increase timeout
  });

  describe("getMarkdownStyles", () => {
    it("should return markdown styles as a string", () => {
      const styles = getMarkdownStyles();
      expect(typeof styles).toBe("string");
      expect(styles.includes("font-family")).toBe(true);
      expect(styles.includes("line-height")).toBe(true);
    });
  });
});
