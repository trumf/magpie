/**
 * Unit tests for AnnotationStorage module
 * Tests the functionality to store and retrieve annotations in IndexedDB
 */

// Import the mock setup before importing the module
import "./annotation-test-setup.js";
import {AnnotationStorage} from "./AnnotationStorage.js";

describe("AnnotationStorage", () => {
  let storage;

  // Mock data for testing
  const testAnnotation = {
    id: "test-annotation-id",
    anchor: {
      text: "test selected text",
      context: "before test selected text after",
      textPosition: 7,
    },
    content: "This is a test annotation",
    dateCreated: new Date("2023-01-01"),
    fileId: 1,
    filePath: "test/document.md",
  };

  const testAnnotation2 = {
    id: "test-annotation-id-2",
    anchor: {
      text: "another selection",
      context: "this is another selection for testing",
      textPosition: 8,
    },
    content: "Second annotation",
    dateCreated: new Date("2023-01-02"),
    fileId: 1,
    filePath: "test/document.md",
  };

  const testAnnotation3 = {
    id: "test-annotation-id-3",
    anchor: {
      text: "different file",
      context: "this is in a different file",
      textPosition: 11,
    },
    content: "Annotation in another file",
    dateCreated: new Date("2023-01-03"),
    fileId: 2,
    filePath: "test/another.md",
  };

  beforeEach(async () => {
    // Create a fresh instance before each test
    // Using a unique DB name for testing to avoid conflicts
    storage = new AnnotationStorage({
      dbName: "AnnotationTestDB-" + Date.now(),
      statusCallback: (type, message) => {
        // Mock status callback
        console.log(`Status (${type}): ${message}`);
      },
    });

    // Initialize the database
    await storage.initIndexedDB();
  }, 10000); // Set timeout to 10 seconds

  afterEach(async () => {
    // Clean up after tests
    if (storage && storage.db) {
      storage.db.close();

      // Delete the test database to avoid pollution
      await new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(storage.config.dbName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve(); // Still resolve to continue tests
      });
    }
  });

  test("should initialize IndexedDB successfully", () => {
    expect(storage.db).not.toBeNull();
    expect(storage.db.name).toBe(storage.config.dbName);
  });

  test("should save an annotation", async () => {
    const id = await storage.saveAnnotation(testAnnotation);
    expect(id).toBe(testAnnotation.id);

    // Verify it can be retrieved
    const savedAnnotation = await storage.getAnnotationById(id);
    expect(savedAnnotation.content).toBe(testAnnotation.content);
    expect(savedAnnotation.fileId).toBe(testAnnotation.fileId);
  });

  test("should update an existing annotation", async () => {
    // First save it
    await storage.saveAnnotation(testAnnotation);

    // Then update it
    const updatedAnnotation = {
      ...testAnnotation,
      content: "Updated annotation content",
    };

    await storage.updateAnnotation(updatedAnnotation);

    // Verify the update
    const saved = await storage.getAnnotationById(testAnnotation.id);
    expect(saved.content).toBe("Updated annotation content");
  });

  test("should delete an annotation", async () => {
    // First save it
    await storage.saveAnnotation(testAnnotation);

    // Then delete it
    await storage.deleteAnnotation(testAnnotation.id);

    // Verify it's gone
    try {
      await storage.getAnnotationById(testAnnotation.id);
      fail("Should have thrown an error for non-existent annotation");
    } catch (error) {
      expect(error.message).toContain(
        `Annotation with ID ${testAnnotation.id} not found`
      );
    }
  });

  test("should get all annotations", async () => {
    // Save multiple annotations
    await storage.saveAnnotation(testAnnotation);
    await storage.saveAnnotation(testAnnotation2);
    await storage.saveAnnotation(testAnnotation3);

    // Get all annotations
    const allAnnotations = await storage.getAllAnnotations();
    expect(allAnnotations.length).toBe(3);
  });

  test("should get annotations by file", async () => {
    // Save multiple annotations
    await storage.saveAnnotation(testAnnotation);
    await storage.saveAnnotation(testAnnotation2);
    await storage.saveAnnotation(testAnnotation3);

    // Get annotations for fileId 1
    const fileAnnotations = await storage.getAnnotationsByFile(1);
    expect(fileAnnotations.length).toBe(2);

    // Verify they have the correct file path
    const filePaths = fileAnnotations.map((a) => a.filePath);
    expect(filePaths).toContain("test/document.md");
    expect(filePaths).not.toContain("test/another.md");
  });

  test("should handle search by text", async () => {
    // Save multiple annotations
    await storage.saveAnnotation(testAnnotation);
    await storage.saveAnnotation(testAnnotation2);
    await storage.saveAnnotation(testAnnotation3);

    // Search for annotations containing "test"
    const results = await storage.searchAnnotations("test");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "test-annotation-id")).toBe(true);
  });

  test("should clear all annotations", async () => {
    // Save multiple annotations
    await storage.saveAnnotation(testAnnotation);
    await storage.saveAnnotation(testAnnotation2);

    // Clear all
    await storage.clearAnnotations();

    // Verify all are gone
    const remaining = await storage.getAllAnnotations();
    expect(remaining.length).toBe(0);
  });
});
