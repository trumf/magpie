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
  parse: jest.fn((markdown) => {
    // Basic mock: Handle # heading for the specific test case
    if (markdown.startsWith("# ")) {
      const content = markdown.substring(2);
      const id = content.toLowerCase().replace(/\s+/g, "-");
      return `<h1 id="${id}">${content}</h1>\n`;
    }
    // Default fallback
    return `<p>${markdown}</p>`;
  }),
  setOptions: jest.fn((options) => {
    // Do nothing, just track calls
  }),
};

describe("MarkdownRendering", () => {
  // Setup and teardown
  beforeEach(() => {
    // Clear mock function calls automatically handled by jest.clearAllMocks()
    /*
    // Clear call tracking
    parseCallArgs = [];
    setOptionsCallArgs = [];
    */

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
      // Use Jest matchers
      expect(global.marked.parse).toHaveBeenCalledWith("Test markdown");
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
      expect(testDiv.innerHTML).toBe(
        '<h1 id="markdown-from-url">Markdown from URL</h1>\n'
      );
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
    // Test 1: Successful read
    it("should read file and render markdown content", async () => {
      // Create a mock file with content
      const testFile = {
        name: "test.md",
        content: "# File Markdown",
      };

      // Create a mock FileReader that triggers onload
      class MockFileReaderSuccess {
        constructor() {
          this.result = null;
          this.onload = null;
        }
        readAsText(file) {
          this.result = file.content;
          setTimeout(() => {
            this.onload?.({target: {result: this.result}});
          }, 0);
        }
      }
      const originalFileReader = window.FileReader;
      window.FileReader = MockFileReaderSuccess; // Override global mock locally

      const testDiv = document.createElement("div");
      testDiv.id = "test-div-success";
      document.body.appendChild(testDiv);

      try {
        const promise = renderMarkdownFromFile(testFile, testDiv);
        // Advance timers to trigger the mock FileReader's onload
        jest.runAllTimers();
        await promise; // Wait for the rendering promise to resolve
        expect(testDiv.innerHTML).toBe(
          '<h1 id="file-markdown">File Markdown</h1>\n'
        );
      } finally {
        // Clean up DOM element
        document.body.removeChild(testDiv);
        // Restore original FileReader (optional, but good practice if needed elsewhere)
        window.FileReader = originalFileReader;
      }
    });

    // Test 2: Reject on no file
    it("should reject if no file is provided", async () => {
      const testDiv = document.createElement("div");
      await expect(renderMarkdownFromFile(null, testDiv)).rejects.toThrow(
        "No file provided"
      );
    });

    // Test 3: FileReader error
    it("should handle FileReader errors", async () => {
      // Create a mock FileReader that triggers onerror
      class MockFileReaderError {
        constructor() {
          this.onerror = null;
        }
        readAsText(file) {
          setTimeout(() => {
            this.onerror?.(new Error("Read error"));
          }, 0);
        }
      }
      const originalFileReader = window.FileReader;
      window.FileReader = MockFileReaderError; // Override global mock locally

      const testFile = {name: "test.md"};
      const testDiv = document.createElement("div");
      testDiv.id = "test-div-error";
      document.body.appendChild(testDiv);

      try {
        const promise = renderMarkdownFromFile(testFile, testDiv);
        // Advance timers to trigger the mock FileReader's onerror
        jest.runAllTimers();
        await expect(promise).rejects.toThrow("Error reading file");
      } finally {
        // Clean up DOM element
        document.body.removeChild(testDiv);
        // Restore original FileReader
        window.FileReader = originalFileReader;
      }
    });
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
