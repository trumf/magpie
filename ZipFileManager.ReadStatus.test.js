/**
 * Test the file read state tracking without IndexedDB dependencies
 * Uses Jest test runner.
 */

// Remove Node.js runner imports
// import {test} from "node:test";
// import assert from "node:assert";

// Import the class to test
import {ZipFileManager} from "./ZipFileManager.js";

test("updateFileReadStatus should mark a file as read", () => {
  const zipManager = new ZipFileManager();

  // Create test data
  const zipData = {
    id: 1,
    name: "test.zip",
    files: [{path: "document.md", content: "# Test content"}],
  };

  // Mark the file as read
  const updatedZipData = zipManager.updateFileReadStatus(
    zipData,
    "document.md",
    true
  );

  // Verify the file is marked as read
  const file = updatedZipData.files.find((f) => f.path === "document.md");
  expect(file.isRead).toBe(true);
  expect(file.readDate).toBeTruthy();
});

test("updateFileReadStatus should mark a file as unread", () => {
  const zipManager = new ZipFileManager();

  // Create test data
  const zipData = {
    id: 1,
    name: "test.zip",
    files: [
      {
        path: "document.md",
        content: "# Test content",
        isRead: true,
        readDate: new Date().toISOString(),
      },
    ],
  };

  // Mark the file as unread
  const updatedZipData = zipManager.updateFileReadStatus(
    zipData,
    "document.md",
    false
  );

  // Verify the file is marked as unread
  const file = updatedZipData.files.find((f) => f.path === "document.md");
  expect(file.isRead).toBe(false);
  expect(file.readDate).toBeUndefined();
});

test("updateFileReadStatus should handle non-existent files", () => {
  const zipManager = new ZipFileManager();

  // Create test data
  const zipData = {
    id: 1,
    name: "test.zip",
    files: [{path: "document.md", content: "# Test content"}],
  };

  // Try to mark a non-existent file
  const updatedZipData = zipManager.updateFileReadStatus(
    zipData,
    "nonexistent.md",
    true
  );

  // Verify the original data is unchanged
  expect(updatedZipData).toEqual(zipData);
});

test("updateFileReadStatus should handle invalid input", () => {
  const zipManager = new ZipFileManager();

  // Test with null data
  expect(zipManager.updateFileReadStatus(null, "document.md", true)).toBeNull();

  // Test with empty array
  const emptyData = {files: []};
  expect(
    zipManager.updateFileReadStatus(emptyData, "document.md", true)
  ).toEqual(emptyData);
});

test("checkFileReadStatus should return true for read files", () => {
  const zipManager = new ZipFileManager();

  // Create test data
  const zipData = {
    id: 1,
    name: "test.zip",
    files: [
      {
        path: "document.md",
        content: "# Test content",
        isRead: true,
        readDate: new Date().toISOString(),
      },
    ],
  };

  // Check if file is read
  const isRead = zipManager.checkFileReadStatus(zipData, "document.md");

  // Verify result
  expect(isRead).toBe(true);
});

test("checkFileReadStatus should return false for unread files", () => {
  const zipManager = new ZipFileManager();

  // Create test data
  const zipData = {
    id: 1,
    name: "test.zip",
    files: [{path: "document.md", content: "# Test content"}],
  };

  // Check if file is read
  const isRead = zipManager.checkFileReadStatus(zipData, "document.md");

  // Verify result
  expect(isRead).toBe(false);
});

test("checkFileReadStatus should return false for non-existent files", () => {
  const zipManager = new ZipFileManager();

  // Create test data
  const zipData = {
    id: 1,
    name: "test.zip",
    files: [{path: "document.md", content: "# Test content"}],
  };

  // Check if a non-existent file is read
  const isRead = zipManager.checkFileReadStatus(zipData, "nonexistent.md");

  // Verify result
  expect(isRead).toBe(false);
});

test("checkFileReadStatus should handle invalid input", () => {
  const zipManager = new ZipFileManager();

  // Test with null data
  expect(zipManager.checkFileReadStatus(null, "document.md")).toBe(false);

  // Test with empty array
  expect(zipManager.checkFileReadStatus({files: []}, "document.md")).toBe(
    false
  );
});
