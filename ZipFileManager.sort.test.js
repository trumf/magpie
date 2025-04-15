/**
 * Test the file sorting functionality in ZipFileManager
 */

import {test} from "node:test";
import assert from "node:assert";
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
  assert.strictEqual(sortedFiles[0].path, "b.md");
  assert.strictEqual(sortedFiles[1].path, "d.md");
  assert.strictEqual(sortedFiles[2].path, "a.md");
  assert.strictEqual(sortedFiles[3].path, "c.md");
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
  assert.strictEqual(sortedFiles[0].path, "a.md");
  assert.strictEqual(sortedFiles[1].path, "c.md");
  assert.strictEqual(sortedFiles[2].path, "b.md");
  assert.strictEqual(sortedFiles[3].path, "d.md");
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
  assert.strictEqual(unreadFirstSorted[0].path, "b.md");
  assert.strictEqual(unreadFirstSorted[1].path, "d.md");
  assert.strictEqual(unreadFirstSorted[2].path, "a.md");
  assert.strictEqual(unreadFirstSorted[3].path, "c.md");

  // Sort the files (read first)
  const readFirstSorted = zipManager.sortFilesByReadStatus(
    testFiles,
    "read_first"
  );

  // Verify read files come first and are alphabetically sorted
  assert.strictEqual(readFirstSorted[0].path, "a.md");
  assert.strictEqual(readFirstSorted[1].path, "c.md");
  assert.strictEqual(readFirstSorted[2].path, "b.md");
  assert.strictEqual(readFirstSorted[3].path, "d.md");
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
  assert.strictEqual(sortedFiles[0].path, "a.md");
  assert.strictEqual(sortedFiles[1].path, "c.md");
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
  assert.strictEqual(sortedFiles[0].path, "a.md");
  assert.strictEqual(sortedFiles[1].path, "c.md");
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
  assert.strictEqual(sortedFiles[0].path, "c.md");
  assert.strictEqual(sortedFiles[1].path, "d.md");
  assert.strictEqual(sortedFiles[2].path, "a.md");
  // Unread files last, alphabetically
  assert.strictEqual(sortedFiles[3].path, "b.md");
});

test("sortFilesByReadStatus should handle empty array", () => {
  const zipManager = new ZipFileManager();

  // Sort empty array
  const sortedFiles = zipManager.sortFilesByReadStatus([], "unread_first");

  // Verify empty array is returned
  assert.deepStrictEqual(sortedFiles, []);
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
  assert.strictEqual(sortedFiles[0].path, "a.md");
  assert.strictEqual(sortedFiles[1].path, "b.md");
});
