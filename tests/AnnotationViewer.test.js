import {AnnotationViewer} from "../src/components/annotations/AnnotationViewer.js";
import {jest} from "@jest/globals";
import "./annotation-viewer-test-setup.js";

// Create mock data for tests
const mockAnnotations = [
  {
    id: "1",
    fileId: "zip123",
    filePath:
      "Finance 75604854049d4b4e95f5c72ed1a6b792/My Document 1803c4fa8cc381a29fb8fac09ec0cd16.md",
    content: "This is an important point",
    dateCreated: new Date("2023-01-01"),
    anchor: {
      text: "This is the selected text from the document",
      elementId: "p1",
      startOffset: 10,
      endOffset: 25,
    },
    note: "# Document Headline\n\nSome note content",
    tags: ["important", "review"],
  },
  {
    id: "2",
    fileId: "zip456",
    filePath: "Regular Document.md",
    content: "Need to follow up on this",
    dateCreated: new Date("2023-01-02"),
    anchor: {
      text: "Another selection from a different document",
      elementId: "p3",
      startOffset: 5,
      endOffset: 15,
    },
    note: "",
    tags: ["follow-up"],
  },
];

// Mock HeadlineExtraction module functions
const mockHeadlineExtraction = {
  extractDisplayName: jest.fn().mockImplementation((content, filename) => {
    if (content && content.includes("# Document Headline")) {
      return "Document Headline";
    } else if (filename === "Regular Document.md") {
      return "Regular Document";
    } else {
      // Fall back to filename without hash
      return filename.replace(/\s+[a-f0-9]{32}\.(md|MD)$/, "");
    }
  }),
};

// Create mock storage instance with mocked methods
const mockAnnotationStorage = {
  initIndexedDB: jest.fn().mockResolvedValue(true),
  getAllAnnotations: jest.fn().mockResolvedValue(mockAnnotations),
  getAnnotationsByFile: jest
    .fn()
    .mockImplementation((fileId) =>
      Promise.resolve(mockAnnotations.filter((a) => a.fileId === fileId))
    ),
  searchAnnotations: jest
    .fn()
    .mockImplementation((query) =>
      Promise.resolve(
        mockAnnotations.filter(
          (a) => a.content.includes(query) || a.anchor.text.includes(query)
        )
      )
    ),
  searchAnnotationsByTag: jest
    .fn()
    .mockImplementation((tag) =>
      Promise.resolve(
        mockAnnotations.filter((a) => (a.tags || []).includes(tag))
      )
    ),
};

// Mock the AnnotationStorage class
global.AnnotationStorage = jest
  .fn()
  .mockImplementation(() => mockAnnotationStorage);

// Mock the extractDisplayName function
global.extractDisplayName = mockHeadlineExtraction.extractDisplayName;

describe("AnnotationViewer", () => {
  let annotationViewer;

  // Setup DOM for testing
  beforeEach(() => {
    // Reset mock call counts before each test
    jest.clearAllMocks();

    document.body.innerHTML = '<div id="annotation-container"></div>';
    annotationViewer = new AnnotationViewer();

    // Ensure the storage property uses our mocks
    annotationViewer.storage = mockAnnotationStorage;
  });

  test("should initialize properly", async () => {
    await annotationViewer.initialize();
    expect(annotationViewer.storage.initIndexedDB).toHaveBeenCalled();
  });

  test("should get all annotations", async () => {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAllAnnotations();

    expect(annotations).toHaveLength(2);
    expect(annotations[0].id).toBe("1");
    expect(annotations[1].id).toBe("2");
    expect(annotationViewer.storage.getAllAnnotations).toHaveBeenCalled();
  });

  test("should get annotations by file ID", async () => {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAnnotationsByFile("zip123");

    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe("1");
    expect(annotations[0].fileId).toBe("zip123");
    expect(annotationViewer.storage.getAnnotationsByFile).toHaveBeenCalledWith(
      "zip123"
    );
  });

  test("should search annotations", async () => {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.searchAnnotations("important");

    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe("1");
    expect(annotationViewer.storage.searchAnnotations).toHaveBeenCalledWith(
      "important"
    );
  });

  test("should format annotations for display", async () => {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAllAnnotations();
    const formattedAnnotations =
      annotationViewer.formatAnnotationsForDisplay(annotations);

    expect(formattedAnnotations).toHaveLength(2);
    expect(formattedAnnotations[0].displayText).toBeDefined();
    expect(formattedAnnotations[0].displayDate).toBeDefined();
    expect(formattedAnnotations[0].fileLink).toBeDefined();
  });

  test("formatAnnotationForDisplay extracts clean display name for file paths", async () => {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAllAnnotations();

    const formattedAnnotation = annotationViewer.formatAnnotationForDisplay(
      annotations[0]
    );

    // Test that it properly extracts the title from the note
    expect(formattedAnnotation.displayFilePath).toBe("Document Headline");

    // For file without note content, it should clean up the filename
    const formattedAnnotation2 = annotationViewer.formatAnnotationForDisplay(
      annotations[1]
    );
    expect(formattedAnnotation2.displayFilePath).toBe("Regular Document");
  });

  test("renderAnnotationsToElement uses displayFilePath for rendering", async () => {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAllAnnotations();

    const container = document.getElementById("annotation-container");
    annotationViewer.renderAnnotationsToElement(annotations, container);

    // Check that the rendered HTML contains the clean display names
    const renderedHtml = container.innerHTML;
    expect(renderedHtml).toContain("Document Headline");
    expect(renderedHtml).toContain("Regular Document");

    // Links should still have the original paths and the original title attribute
    const links = container.querySelectorAll(".file-link");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute("title")).toBe(
      "Finance 75604854049d4b4e95f5c72ed1a6b792/My Document 1803c4fa8cc381a29fb8fac09ec0cd16.md"
    );
    expect(links[links.length > 1 ? 1 : 0].getAttribute("href")).toContain(
      "file="
    );
    expect(links[links.length > 1 ? 1 : 0].getAttribute("href")).toContain(
      "path="
    );
  });
});
