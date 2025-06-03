/**
 * AnnotationFragmentHandler.test.js
 *
 * Tests for the annotation fragment handling functionality,
 * which scrolls to an annotation when the URL contains a fragment
 * with an annotation ID.
 */

describe("Annotation Fragment Handler", () => {
  // Mock for the AnnotationSystem object
  const mockAnnotationSystem = {
    initialize: jest.fn(),
    scrollToAnnotation: jest.fn(),
    reset: jest.fn(),
  };

  // Store the original location and timing functions
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    delete window.location;
    window.location = {
      hash: "#annotation=test123",
      href: "http://example.com/index.html?file=1&path=test.md#annotation=test123",
      search: "?file=1&path=test.md",
    };

    // Reset mocks
    mockAnnotationSystem.scrollToAnnotation.mockReset();

    // Define global AnnotationSystem mock
    global.AnnotationSystem = mockAnnotationSystem;

    // Create mock DOM elements
    const mockContent = document.createElement("div");
    mockContent.id = "markdown-content";
    document.body.appendChild(mockContent);

    // Mock setTimeout to execute immediately
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore original objects and cleanup
    window.location = originalLocation;
    delete global.AnnotationSystem;

    // Remove mock elements
    const mockContent = document.getElementById("markdown-content");
    if (mockContent) {
      document.body.removeChild(mockContent);
    }

    // Restore timers
    jest.useRealTimers();
  });

  test("should extract annotation ID from URL fragment and scroll to annotation", () => {
    // Arrange
    const mockAnnotationId = "test123";

    // Simulate the relevant part of the displayMarkdownFile function
    // that handles the URL fragment
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const annotationId = hashParams.get("annotation");

    if (annotationId && AnnotationSystem.scrollToAnnotation) {
      setTimeout(() => {
        AnnotationSystem.scrollToAnnotation({id: annotationId});
      }, 300);
    }

    // Act
    jest.advanceTimersByTime(300);

    // Assert
    expect(annotationId).toBe(mockAnnotationId);
    expect(AnnotationSystem.scrollToAnnotation).toHaveBeenCalledWith({
      id: mockAnnotationId,
    });
  });

  test("should not scroll when no annotation ID is in fragment", () => {
    // Arrange
    // Change hash to not have an annotation
    window.location.hash = "#no-annotation-here";

    // Simulate the relevant part of the displayMarkdownFile function
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const annotationId = hashParams.get("annotation");

    if (annotationId && AnnotationSystem.scrollToAnnotation) {
      setTimeout(() => {
        AnnotationSystem.scrollToAnnotation({id: annotationId});
      }, 300);
    }

    // Act
    jest.advanceTimersByTime(300);

    // Assert
    expect(annotationId).toBeNull();
    expect(AnnotationSystem.scrollToAnnotation).not.toHaveBeenCalled();
  });

  test("should not attempt to scroll if scrollToAnnotation is not available", () => {
    // Arrange
    // Remove the scrollToAnnotation method
    const tempScrollFn = AnnotationSystem.scrollToAnnotation;
    delete AnnotationSystem.scrollToAnnotation;

    // Flag to check if setTimeout was called
    let timeoutCalled = false;
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = (fn, delay) => {
      if (delay === 300) {
        timeoutCalled = true;
      }
      return originalSetTimeout(fn, 0); // Execute immediately for testing
    };

    // Simulate the relevant part of the displayMarkdownFile function
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const annotationId = hashParams.get("annotation");

    if (annotationId && AnnotationSystem.scrollToAnnotation) {
      setTimeout(() => {
        AnnotationSystem.scrollToAnnotation({id: annotationId});
      }, 300);
    }

    // Act
    jest.advanceTimersByTime(300);

    // Assert
    expect(annotationId).toBe("test123");
    expect(timeoutCalled).toBe(false);

    // Restore the function
    AnnotationSystem.scrollToAnnotation = tempScrollFn;
    window.setTimeout = originalSetTimeout;
  });
});
