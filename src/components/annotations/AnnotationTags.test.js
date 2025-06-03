/**
 * Unit tests for the annotation tagging functionality
 * Tests the ability to add, retrieve, and search annotations by tags
 */

// Import the mock setup before importing the module
import "./annotation-test-setup.js";
import {AnnotationStorage} from "./AnnotationStorage.js";

describe("Annotation Tags", () => {
  let storage;

  // Test annotation with tags
  const testAnnotationWithTags = {
    id: "test-annotation-with-tags",
    anchor: {
      text: "test selected text",
      context: "before test selected text after",
      textPosition: 7,
    },
    content: "This is a test annotation with tags",
    tags: ["important", "question"],
    dateCreated: new Date("2023-01-01"),
    fileId: 1,
    filePath: "test/document.md",
  };

  const testAnnotationWithoutTags = {
    id: "test-annotation-without-tags",
    anchor: {
      text: "another selection",
      context: "this is another selection for testing",
      textPosition: 8,
    },
    content: "Second annotation without tags",
    dateCreated: new Date("2023-01-02"),
    fileId: 1,
    filePath: "test/document.md",
  };

  beforeEach(async () => {
    // Create a fresh instance before each test
    // Using a unique DB name for testing to avoid conflicts
    storage = new AnnotationStorage({
      dbName: "AnnotationTagsTestDB-" + Date.now(),
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

  test("should save annotation with tags", async () => {
    const id = await storage.saveAnnotation(testAnnotationWithTags);
    expect(id).toBe(testAnnotationWithTags.id);

    // Verify it can be retrieved with tags intact
    const savedAnnotation = await storage.getAnnotationById(id);
    expect(savedAnnotation.tags).toEqual(testAnnotationWithTags.tags);
  });

  test("should retrieve annotations with and without tags", async () => {
    // Save both annotations
    await storage.saveAnnotation(testAnnotationWithTags);
    await storage.saveAnnotation(testAnnotationWithoutTags);

    // Retrieve all annotations
    const allAnnotations = await storage.getAllAnnotations();

    // Find the ones with our test IDs
    const withTags = allAnnotations.find(
      (a) => a.id === testAnnotationWithTags.id
    );
    const withoutTags = allAnnotations.find(
      (a) => a.id === testAnnotationWithoutTags.id
    );

    // Verify tags exist on one and not on the other
    expect(withTags.tags).toEqual(testAnnotationWithTags.tags);
    expect(withoutTags.tags).toBeUndefined();
  });

  test("should be able to search annotations by tag", async () => {
    // This test will fail until we implement the searchAnnotationsByTag method
    // Save both annotations
    await storage.saveAnnotation(testAnnotationWithTags);
    await storage.saveAnnotation(testAnnotationWithoutTags);

    // Search by tag - this method doesn't exist yet, so this test should fail
    const results = await storage.searchAnnotationsByTag("important");

    // Expect only the annotation with the "important" tag
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(testAnnotationWithTags.id);
  });

  test("should update tags for an existing annotation", async () => {
    // First save with initial tags
    await storage.saveAnnotation(testAnnotationWithTags);

    // Then update the tags
    const updatedAnnotation = {
      ...testAnnotationWithTags,
      tags: ["important", "question", "new-tag"],
    };

    await storage.updateAnnotation(updatedAnnotation);

    // Verify the update
    const saved = await storage.getAnnotationById(testAnnotationWithTags.id);
    expect(saved.tags.length).toBe(3);
    expect(saved.tags).toContain("new-tag");
  });
});
