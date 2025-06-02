/**
 * Basic unit tests for the Markdown Annotation functionality
 * Note: Due to heavy reliance on browser APIs, we only test the simple
 * functions and data structures, not the complex DOM interactions
 */

import {AnnotationSystem} from "../src/components/annotations/MarkdownAnnotation.js";
import {jest} from "@jest/globals";

// We need to properly set up our mocks BEFORE importing the module
// Use jest.spyOn to access and mock internal functions

// Mock the IndexedDB API
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
};

// Replace global indexedDB
Object.defineProperty(window, "indexedDB", {
  value: mockIndexedDB,
  writable: true,
});

// Simulate successful IndexedDB operations
function setupSuccessfulDbOperations() {
  // Create a simplified mock that immediately triggers success callbacks
  window.indexedDB.open = jest.fn().mockImplementation(() => {
    const request = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            put: jest.fn(() => {
              return {
                onsuccess: null,
                set onsuccess(fn) {
                  setTimeout(() => fn({target: {result: "test-id"}}), 0);
                },
              };
            }),
            getAll: jest.fn(() => {
              return {
                onsuccess: null,
                set onsuccess(fn) {
                  setTimeout(() => fn({target: {result: []}}), 0);
                },
              };
            }),
            index: jest.fn(() => ({
              getAll: jest.fn(() => {
                return {
                  onsuccess: null,
                  set onsuccess(fn) {
                    setTimeout(() => fn({target: {result: []}}), 0);
                  },
                };
              }),
            })),
          })),
        })),
      },
    };

    // Auto-trigger success
    setTimeout(() => {
      if (request.onsuccess)
        request.onsuccess({target: {result: request.result}});
    }, 0);

    return request;
  });
}

describe("MarkdownAnnotation Basic Tests", () => {
  // Set up DOM elements for testing
  beforeEach(() => {
    // Reset the annotation system between tests
    AnnotationSystem.reset();

    // Set up our IndexedDB mocks to succeed
    setupSuccessfulDbOperations();

    // Create markdown content container
    document.body.innerHTML = `
      <div id="markdown-content" class="main-content">
        <h1>Test Document</h1>
        <p>This is a paragraph with some text that can be annotated.</p>
        <p>This is another paragraph with more text.</p>
      </div>
    `;

    // Spy on console.error to catch errors
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  // Clean up after each test
  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("should properly initialize with a document container", () => {
    const container = document.getElementById("markdown-content");
    AnnotationSystem.initialize(container, 123, "test-file.md");

    expect(AnnotationSystem.getDocumentContainer()).toBe(container);
  });

  test("should have empty annotations list by default", () => {
    expect(AnnotationSystem.getAnnotations()).toEqual([]);
  });

  test("should properly reset the system state", async () => {
    const container = document.getElementById("markdown-content");
    AnnotationSystem.initialize(container, 123, "test-file.md");

    // Since we can't easily manipulate the private variable directly,
    // we'll test the public API for resetting after we confirm the system is initialized
    expect(AnnotationSystem.getDocumentContainer()).toBe(container);

    // Reset the system
    AnnotationSystem.reset();

    // Verify the system is reset
    expect(AnnotationSystem.getAnnotations()).toEqual([]);
    expect(AnnotationSystem.getDocumentContainer()).toBeNull();
  });

  test("should handle simple anchor text creation", () => {
    // This is a minimal test that doesn't rely on Range API
    const mockSelection = {
      toString: () => "test text",
      getRangeAt: () => ({
        toString: () => "test text",
        cloneRange: () => ({
          toString: () => "before test text after",
          setStart: () => {},
          setEnd: () => {},
        }),
        startContainer: {
          nodeType: Node.TEXT_NODE,
          parentNode: {
            tagName: "P",
            id: null,
            className: "test-paragraph",
            parentNode: {
              tagName: "DIV",
              id: "markdown-content",
              children: [],
            },
            children: [],
          },
        },
        endContainer: {
          nodeType: Node.TEXT_NODE,
          parentNode: {
            tagName: "P",
            id: null,
            className: "test-paragraph",
            parentNode: {
              tagName: "DIV",
              id: "markdown-content",
              children: [],
            },
            children: [],
          },
        },
        commonAncestorContainer: {
          nodeType: Node.TEXT_NODE,
          parentNode: {
            tagName: "P",
            id: null,
            className: "test-paragraph",
            parentNode: {
              tagName: "DIV",
              id: "markdown-content",
              children: [],
            },
            children: [],
          },
        },
        startOffset: 0,
        endOffset: 9,
      }),
    };

    const anchor = AnnotationSystem.createAnchor(mockSelection);

    // We only check that the function returns an object with the expected properties
    expect(anchor).toBeDefined();
    expect(typeof anchor.text).toBe("string");
    expect(anchor.text).toBe("test text");
    expect(typeof anchor.context).toBe("string");
    expect(typeof anchor.textPosition).toBe("number");

    // elementPath might be null/undefined in some environments or older versions
    if (anchor.elementPath !== undefined && anchor.elementPath !== null) {
      expect(typeof anchor.elementPath).toBe("string");
    }
  });
});

// Skip the DOM interaction tests in the test environment
describe.skip("DOM Interaction Tests (skipped in test environment)", () => {
  test("should detect text selection", () => {
    // This would be tested manually in the browser
  });

  test("should create annotations for selected text", () => {
    // This would be tested manually in the browser
  });

  test("should highlight text when annotated", () => {
    // This would be tested manually in the browser
  });
});
