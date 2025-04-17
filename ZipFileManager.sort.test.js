/**
 * Test the file sorting functionality in ZipFileManager
 * Uses Jest test runner.
 */

// Remove Node.js runner imports
// import {test} from "node:test";
// import assert from "node:assert";

// Import the class to test
import {ZipFileManager} from "./ZipFileManager.js";

test("sortFilesByReadStatus should sort files with unread files first", () => {
  const zipManager = new ZipFileManager();

  // Create test data with mixed read and unread files
  const testFiles = [
    {
      path: "a.md",
      displayName: "A Document",
      isRead: true,
      readDate: "2023-01-01T12:00:00Z",
    },
    {path: "b.md", displayName: "B Document", isRead: false},
    {
      path: "c.md",
      displayName: "C Document",
      isRead: true,
      readDate: "2023-01-02T12:00:00Z",
    },
    {path: "d.md", displayName: "D Document", isRead: false},
  ];

  // Sort the files
  const sortedFiles = zipManager.sortFilesByReadStatus(
    testFiles,
    "unread_first"
  );

  // Verify unread files come first
  expect(sortedFiles[0].path).toBe("b.md");
  expect(sortedFiles[1].path).toBe("d.md");
  expect(sortedFiles[2].path).toBe("a.md");
  expect(sortedFiles[3].path).toBe("c.md");
});

test("sortFilesByReadStatus should sort files with read files first", () => {
  const zipManager = new ZipFileManager();

  // Create test data with mixed read and unread files
  const testFiles = [
    {
      path: "a.md",
      displayName: "A Document",
      isRead: true,
      readDate: "2023-01-01T12:00:00Z",
    },
    {path: "b.md", displayName: "B Document", isRead: false},
    {
      path: "c.md",
      displayName: "C Document",
      isRead: true,
      readDate: "2023-01-02T12:00:00Z",
    },
    {path: "d.md", displayName: "D Document", isRead: false},
  ];

  // Sort the files
  const sortedFiles = zipManager.sortFilesByReadStatus(testFiles, "read_first");

  // Verify read files come first
  expect(sortedFiles[0].path).toBe("a.md");
  expect(sortedFiles[1].path).toBe("c.md");
  expect(sortedFiles[2].path).toBe("b.md");
  expect(sortedFiles[3].path).toBe("d.md");
});

test("sortFilesByReadStatus should maintain alphabetical sorting within each group", () => {
  const zipManager = new ZipFileManager();

  // Create test data with mixed read and unread files in non-alphabetical order
  const testFiles = [
    {
      path: "c.md",
      displayName: "C Document",
      isRead: true,
      readDate: "2023-01-02T12:00:00Z",
    },
    {path: "d.md", displayName: "D Document", isRead: false},
    {
      path: "a.md",
      displayName: "A Document",
      isRead: true,
      readDate: "2023-01-01T12:00:00Z",
    },
    {path: "b.md", displayName: "B Document", isRead: false},
  ];

  // Sort the files (unread first)
  const unreadFirstSorted = zipManager.sortFilesByReadStatus(
    testFiles,
    "unread_first"
  );

  // Verify unread files come first and are alphabetically sorted
  expect(unreadFirstSorted[0].path).toBe("b.md");
  expect(unreadFirstSorted[1].path).toBe("d.md");
  expect(unreadFirstSorted[2].path).toBe("a.md");
  expect(unreadFirstSorted[3].path).toBe("c.md");

  // Sort the files (read first)
  const readFirstSorted = zipManager.sortFilesByReadStatus(
    testFiles,
    "read_first"
  );

  // Verify read files come first and are alphabetically sorted
  expect(readFirstSorted[0].path).toBe("a.md");
  expect(readFirstSorted[1].path).toBe("c.md");
  expect(readFirstSorted[2].path).toBe("b.md");
  expect(readFirstSorted[3].path).toBe("d.md");
});

test("sortFilesByReadStatus should handle all-read files", () => {
  const zipManager = new ZipFileManager();

  // Create test data with all files read
  const testFiles = [
    {
      path: "c.md",
      displayName: "C Document",
      isRead: true,
      readDate: "2023-01-02T12:00:00Z",
    },
    {
      path: "a.md",
      displayName: "A Document",
      isRead: true,
      readDate: "2023-01-01T12:00:00Z",
    },
  ];

  // Sort the files
  const sortedFiles = zipManager.sortFilesByReadStatus(
    testFiles,
    "unread_first"
  );

  // Verify files are still alphabetically sorted
  expect(sortedFiles[0].path).toBe("a.md");
  expect(sortedFiles[1].path).toBe("c.md");
});

test("sortFilesByReadStatus should handle all-unread files", () => {
  const zipManager = new ZipFileManager();

  // Create test data with all files unread
  const testFiles = [
    {path: "c.md", displayName: "C Document", isRead: false},
    {path: "a.md", displayName: "A Document", isRead: false},
  ];

  // Sort the files
  const sortedFiles = zipManager.sortFilesByReadStatus(testFiles, "read_first");

  // Verify files are still alphabetically sorted
  expect(sortedFiles[0].path).toBe("a.md");
  expect(sortedFiles[1].path).toBe("c.md");
});

test("sortFilesByReadStatus should sort by recent read date when using read_date mode", () => {
  const zipManager = new ZipFileManager();

  // Create test data with different read dates
  const testFiles = [
    {
      path: "a.md",
      displayName: "A Document",
      isRead: true,
      readDate: "2023-01-01T12:00:00Z",
    },
    {path: "b.md", displayName: "B Document", isRead: false},
    {
      path: "c.md",
      displayName: "C Document",
      isRead: true,
      readDate: "2023-01-03T12:00:00Z",
    },
    {
      path: "d.md",
      displayName: "D Document",
      isRead: true,
      readDate: "2023-01-02T12:00:00Z",
    },
  ];

  // Sort by most recent read date first
  const sortedFiles = zipManager.sortFilesByReadStatus(testFiles, "read_date");

  // Verify files are sorted by readDate (most recent first), with unread files at end
  expect(sortedFiles[0].path).toBe("c.md");
  expect(sortedFiles[1].path).toBe("d.md");
  expect(sortedFiles[2].path).toBe("a.md");
  // Unread files last, alphabetically
  expect(sortedFiles[3].path).toBe("b.md");
});

test("sortFilesByReadStatus should handle empty array", () => {
  const zipManager = new ZipFileManager();

  // Sort empty array
  const sortedFiles = zipManager.sortFilesByReadStatus([], "unread_first");

  // Verify empty array is returned
  expect(sortedFiles).toEqual([]);
});

test("sortFilesByReadStatus should handle invalid sort order", () => {
  const zipManager = new ZipFileManager();

  const testFiles = [
    {path: "a.md", displayName: "A Document", isRead: true},
    {path: "b.md", displayName: "B Document", isRead: false},
  ];

  // Sort with invalid sort order should default to alphabet
  const sortedFiles = zipManager.sortFilesByReadStatus(
    testFiles,
    "invalid_sort"
  );

  // Verify files are sorted alphabetically
  expect(sortedFiles[0].path).toBe("a.md");
  expect(sortedFiles[1].path).toBe("b.md");
});
