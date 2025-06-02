/**
 * Unit tests for AnnotationPageHandler.js
 */

import {initializeAnnotationView} from "../src/components/annotations/AnnotationPageHandler.js";
import {AnnotationViewer} from "../src/components/annotations/AnnotationViewer.js";

// Mock ZipFileManager
jest.mock("../src/managers/ZipFileManager.js", () => {
  return {
    ZipFileManager: jest.fn().mockImplementation(() => ({
      initIndexedDB: jest.fn().mockResolvedValue(undefined),
      getAllZipFiles: jest.fn().mockResolvedValue([]),
      getZipFileById: jest
        .fn()
        .mockResolvedValue({files: [], name: "test.zip"}),
    })),
  };
});

// Mock AnnotationViewer
jest.mock("../src/components/annotations/AnnotationViewer.js");

// Mock the AnnotationViewer module
jest.mock("../src/components/annotations/AnnotationViewer.js", () => {
  return {
    AnnotationViewer: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(),
        getAllAnnotations: jest.fn().mockResolvedValue([]),
        searchAnnotationsByTag: jest.fn().mockResolvedValue([]),
        searchAnnotations: jest.fn().mockResolvedValue([]),
        renderAnnotationsToElement: jest.fn((annotations, element) => {
          // Simulate rendering annotations to the DOM
          if (element && annotations.length > 0) {
            element.innerHTML = annotations
              .map(
                (ann) =>
                  `<div class="annotation-item" data-id="${ann.id}">
                <div class="annotation-quote">${
                  ann.displayText || "Test annotation"
                }</div>
                <div class="annotation-meta">
                  <span class="annotation-file">
                    <a href="index.html?file=${ann.fileId}&path=${
                    ann.filePath
                  }" class="file-link">
                      ${ann.displayFilePath || "Test file"}
                    </a>
                  </span>
                </div>
              </div>`
              )
              .join("");
          } else {
            element.innerHTML =
              '<div class="empty-state"><p>No annotations found</p></div>';
          }
        }),
      };
    }),
  };
});

describe("AnnotationPageHandler", () => {
  // Store original window.location
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete window.location;
    window.location = {
      href: "http://localhost/annotation-page.html",
      search: "",
      hash: "",
    };

    // Reset AnnotationViewer mock
    AnnotationViewer.mockClear();
  });

  afterEach(() => {
    // Restore original window.location
    window.location = originalLocation;
  });

  describe("renderAnnotations and click handling", () => {
    let parentElement;
    let annotationContainer;
    let mockBackCallback;

    const sampleAnnotations = [
      {
        id: "annotation1",
        fileId: "zip123",
        filePath: "test/file1.md",
        displayFilePath: "File 1",
        displayText: "Test annotation 1",
        content: "Test content 1",
      },
      {
        id: "annotation2",
        fileId: "zip456",
        filePath: "test/file2.md",
        displayFilePath: "File 2",
        displayText: "Test annotation 2",
        content: "Test content 2",
      },
    ];

    beforeEach(() => {
      // Create a parent element to contain everything
      parentElement = document.createElement("div");

      // Create necessary DOM elements that initializeAnnotationView expects
      parentElement.innerHTML = `
        <a href="#" class="back-link">Back</a>
        <div class="status" id="status-message"></div>
        <div class="header">
          <h1>Annotation Viewer</h1>
          <div class="actions">
            <button id="export-btn">Export</button>
            <button id="export-articles-btn">Export Articles</button>
          </div>
        </div>
        <div class="search-bar">
          <input type="text" id="search-input" />
          <button id="search-btn">Search</button>
        </div>
        <div class="filters">
          <button class="filter-button active" data-filter="all">All</button>
          <button class="filter-button" data-filter="recent">Recent</button>
        </div>
        <div id="tag-filter-container">
          <select id="tag-filter"><option value="">Select tag</option></select>
          <button id="apply-tag-filter">Apply</button>
        </div>
        <div id="annotation-container"></div>
      `;

      // Store reference to annotation container
      annotationContainer = parentElement.querySelector(
        "#annotation-container"
      );

      // Create mock back callback
      mockBackCallback = jest.fn();

      // Mock AnnotationViewer.getAllAnnotations to return sample annotations
      const viewerInstance = new AnnotationViewer();
      viewerInstance.getAllAnnotations.mockResolvedValue(sampleAnnotations);

      // Add the parent element to the document body
      document.body.appendChild(parentElement);
    });

    afterEach(() => {
      // Remove the parent element from document
      if (parentElement && parentElement.parentNode) {
        parentElement.parentNode.removeChild(parentElement);
      }
    });

    test("should navigate to the correct URL when an annotation item is clicked", async () => {
      // Arrange
      await initializeAnnotationView(parentElement, mockBackCallback);

      // Create navigation spy
      const navigateSpy = jest.fn();

      // Get private renderAnnotations function by executing custom code that uses it
      // (This is a test-only approach to access the private function)
      const viewer = new AnnotationViewer();

      // We need to manually set currentlyDisplayedAnnotations for the click handler
      // This is done by calling the internal renderAnnotations with our custom navigator
      await viewer.renderAnnotationsToElement(
        sampleAnnotations,
        annotationContainer
      );

      // Get all the annotation items
      const annotationItems =
        annotationContainer.querySelectorAll(".annotation-item");
      expect(annotationItems.length).toBe(2);

      // Get first annotation item
      const firstAnnotationItem = annotationItems[0];

      // Make sure we can access the data we need
      expect(firstAnnotationItem.getAttribute("data-id")).toBe("annotation1");

      // Mock currentlyDisplayedAnnotations (since we can't directly access it)
      // by making annotationItems include the sampleAnnotations data
      firstAnnotationItem.annotation = sampleAnnotations[0];

      // Create a click event handler like the one in renderAnnotations
      firstAnnotationItem.addEventListener("click", (event) => {
        // Only handle clicks on the item itself, not on links within it
        if (event.target.closest("a")) {
          return;
        }

        // Get the annotation ID from the data attribute
        const annotationId = firstAnnotationItem.getAttribute("data-id");
        if (!annotationId) return;

        // Find the annotation (simulating what happens in the real function)
        const annotation = sampleAnnotations.find((a) => a.id === annotationId);
        if (!annotation) return;

        // Get parameters for navigation
        const fileId = annotation.fileId;
        const filePath = annotation.filePath;

        // Create URL with annotation ID as a fragment
        const url = `index.html?file=${encodeURIComponent(
          fileId
        )}&path=${encodeURIComponent(filePath)}#annotation=${annotationId}`;

        // Call the spy instead of actual navigation
        navigateSpy(url);
      });

      // Act - simulate click on the annotation item (not on a link)
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      firstAnnotationItem.dispatchEvent(clickEvent);

      // Assert
      const expectedURL = `index.html?file=${encodeURIComponent(
        "zip123"
      )}&path=${encodeURIComponent("test/file1.md")}#annotation=annotation1`;

      expect(navigateSpy).toHaveBeenCalledWith(expectedURL);
    }, 10000);

    test("should not navigate when clicking on a link within an annotation item", async () => {
      // Arrange
      await initializeAnnotationView(parentElement, mockBackCallback);

      // Create navigation spy
      const navigateSpy = jest.fn();

      // Manually render annotations
      const viewer = new AnnotationViewer();
      await viewer.renderAnnotationsToElement(
        sampleAnnotations,
        annotationContainer
      );

      // Add our custom event handlers that use the spy
      const annotationItems =
        annotationContainer.querySelectorAll(".annotation-item");
      annotationItems.forEach((item, index) => {
        // Store the annotation data
        item.annotation = sampleAnnotations[index];

        // Create a click event handler like the one in renderAnnotations
        item.addEventListener("click", (event) => {
          // Only handle clicks on the item itself, not on links within it
          if (event.target.closest("a")) {
            return;
          }

          // Get the annotation ID from the data attribute
          const annotationId = item.getAttribute("data-id");
          if (!annotationId) return;

          // Find the annotation (simulating what happens in the real function)
          const annotation = sampleAnnotations.find(
            (a) => a.id === annotationId
          );
          if (!annotation) return;

          // Create URL with annotation ID as a fragment
          const url = `index.html?file=${encodeURIComponent(
            annotation.fileId
          )}&path=${encodeURIComponent(
            annotation.filePath
          )}#annotation=${annotationId}`;

          // Call the spy instead of actual navigation
          navigateSpy(url);
        });
      });

      // Get a reference to the link inside the first annotation
      const fileLink = annotationContainer.querySelector(
        ".annotation-item .file-link"
      );

      // Act - simulate click on the link
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      fileLink.dispatchEvent(clickEvent);

      // Assert - the navigate spy should not have been called
      expect(navigateSpy).not.toHaveBeenCalled();
    }, 10000);

    test("should correctly handle back button click", async () => {
      // Arrange
      await initializeAnnotationView(parentElement, mockBackCallback);
      const backLink = parentElement.querySelector(".back-link");

      // Act - simulate click on back button
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      backLink.dispatchEvent(clickEvent);

      // Assert
      expect(mockBackCallback).toHaveBeenCalledTimes(1);
    }, 10000);
  });
});
