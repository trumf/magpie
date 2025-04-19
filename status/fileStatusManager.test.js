/**
 * Test the file status and sorting functionality in fileStatusManager.js
 * Uses Jest test runner.
 */

import {
  updateFileReadStatus,
  checkFileReadStatus,
  sortFilesByReadStatus,
} from "./fileStatusManager.js";

// --- Read Status Tests (from ZipFileManager.ReadStatus.test.js) ---

describe("updateFileReadStatus", () => {
  test("should mark a file as read", () => {
    // Create test data
    const zipData = {
      id: 1,
      name: "test.zip",
      files: [{path: "document.md", content: "# Test content"}],
    };

    // Mark the file as read
    const updatedZipData = updateFileReadStatus(zipData, "document.md", true);

    // Verify the file is marked as read
    const file = updatedZipData.files.find((f) => f.path === "document.md");
    expect(file.isRead).toBe(true);
    expect(file.readDate).toBeTruthy();
  });

  test("should mark a file as unread", () => {
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
    const updatedZipData = updateFileReadStatus(zipData, "document.md", false);

    // Verify the file is marked as unread
    const file = updatedZipData.files.find((f) => f.path === "document.md");
    expect(file.isRead).toBe(false);
    expect(file.readDate).toBeUndefined();
  });

  test("should handle non-existent files gracefully", () => {
    // Create test data
    const zipData = {
      id: 1,
      name: "test.zip",
      files: [{path: "document.md", content: "# Test content"}],
    };
    // Create a deep copy to compare against
    const originalZipData = JSON.parse(JSON.stringify(zipData));

    // Try to mark a non-existent file
    const updatedZipData = updateFileReadStatus(
      zipData,
      "nonexistent.md",
      true
    );

    // Verify the original data is unchanged
    expect(updatedZipData).toEqual(originalZipData);
  });

  test("should handle invalid input (null/undefined data)", () => {
    // Test with null data
    expect(updateFileReadStatus(null, "document.md", true)).toBeNull();
    expect(
      updateFileReadStatus(undefined, "document.md", true)
    ).toBeUndefined();
  });

  test("should handle invalid input (missing files array)", () => {
    const invalidData = {id: 1, name: "test.zip"};
    expect(updateFileReadStatus(invalidData, "document.md", true)).toEqual(
      invalidData
    );
  });
});

describe("checkFileReadStatus", () => {
  test("should return true for read files", () => {
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
    const isRead = checkFileReadStatus(zipData, "document.md");
    expect(isRead).toBe(true);
  });

  test("should return false for unread files", () => {
    const zipData = {
      id: 1,
      name: "test.zip",
      files: [{path: "document.md", content: "# Test content", isRead: false}],
    };
    const isRead = checkFileReadStatus(zipData, "document.md");
    expect(isRead).toBe(false);
  });

  test("should return false for files with isRead undefined", () => {
    const zipData = {
      id: 1,
      name: "test.zip",
      files: [{path: "document.md", content: "# Test content"}], // isRead is missing
    };
    const isRead = checkFileReadStatus(zipData, "document.md");
    expect(isRead).toBe(false);
  });

  test("should return false for non-existent files", () => {
    const zipData = {
      id: 1,
      name: "test.zip",
      files: [{path: "document.md", content: "# Test content"}],
    };
    const isRead = checkFileReadStatus(zipData, "nonexistent.md");
    expect(isRead).toBe(false);
  });

  test("should handle invalid input (null/undefined data)", () => {
    expect(checkFileReadStatus(null, "document.md")).toBe(false);
    expect(checkFileReadStatus(undefined, "document.md")).toBe(false);
  });

  test("should handle invalid input (missing files array)", () => {
    expect(checkFileReadStatus({id: 1}, "document.md")).toBe(false);
    expect(checkFileReadStatus({files: null}, "document.md")).toBe(false);
  });
});

// --- Sorting Tests (from ZipFileManager.sort.test.js) ---

describe("sortFilesByReadStatus", () => {
  test("should sort files with unread files first", () => {
    const testFiles = [
      {path: "a.md", isRead: true, readDate: "2023-01-01T12:00:00Z"},
      {path: "b.md", isRead: false},
      {path: "c.md", isRead: true, readDate: "2023-01-02T12:00:00Z"},
      {path: "d.md", isRead: false},
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "unread_first");
    expect(sortedFiles.map((f) => f.path)).toEqual([
      "b.md",
      "d.md",
      "a.md",
      "c.md",
    ]);
  });

  test("should sort files with read files first", () => {
    const testFiles = [
      {path: "a.md", isRead: true, readDate: "2023-01-01T12:00:00Z"},
      {path: "b.md", isRead: false},
      {path: "c.md", isRead: true, readDate: "2023-01-02T12:00:00Z"},
      {path: "d.md", isRead: false},
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "read_first");
    expect(sortedFiles.map((f) => f.path)).toEqual([
      "a.md",
      "c.md",
      "b.md",
      "d.md",
    ]);
  });

  test("should maintain alphabetical sorting within each group (unread first)", () => {
    const testFiles = [
      {path: "c.md", isRead: true, readDate: "2023-01-02T12:00:00Z"},
      {path: "d.md", isRead: false},
      {path: "a.md", isRead: true, readDate: "2023-01-01T12:00:00Z"},
      {path: "b.md", isRead: false},
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "unread_first");
    // Unread: b, d (alpha). Read: a, c (alpha)
    expect(sortedFiles.map((f) => f.path)).toEqual([
      "b.md",
      "d.md",
      "a.md",
      "c.md",
    ]);
  });

  test("should maintain alphabetical sorting within each group (read first)", () => {
    const testFiles = [
      {path: "c.md", isRead: true, readDate: "2023-01-02T12:00:00Z"},
      {path: "d.md", isRead: false},
      {path: "a.md", isRead: true, readDate: "2023-01-01T12:00:00Z"},
      {path: "b.md", isRead: false},
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "read_first");
    // Read: a, c (alpha). Unread: b, d (alpha)
    expect(sortedFiles.map((f) => f.path)).toEqual([
      "a.md",
      "c.md",
      "b.md",
      "d.md",
    ]);
  });

  test("should handle all-read files (maintaining alphabetical order)", () => {
    const testFiles = [
      {path: "c.md", isRead: true, readDate: "2023-01-02T12:00:00Z"},
      {path: "a.md", isRead: true, readDate: "2023-01-01T12:00:00Z"},
    ];
    const sortedUnreadFirst = sortFilesByReadStatus(testFiles, "unread_first");
    expect(sortedUnreadFirst.map((f) => f.path)).toEqual(["a.md", "c.md"]);
    const sortedReadFirst = sortFilesByReadStatus(testFiles, "read_first");
    expect(sortedReadFirst.map((f) => f.path)).toEqual(["a.md", "c.md"]);
  });

  test("should handle all-unread files (maintaining alphabetical order)", () => {
    const testFiles = [
      {path: "c.md", isRead: false},
      {path: "a.md", isRead: false},
    ];
    const sortedUnreadFirst = sortFilesByReadStatus(testFiles, "unread_first");
    expect(sortedUnreadFirst.map((f) => f.path)).toEqual(["a.md", "c.md"]);
    const sortedReadFirst = sortFilesByReadStatus(testFiles, "read_first");
    expect(sortedReadFirst.map((f) => f.path)).toEqual(["a.md", "c.md"]);
  });

  test("should sort by recent read date when using read_date mode", () => {
    const testFiles = [
      {path: "a.md", isRead: true, readDate: "2023-01-01T12:00:00Z"}, // Oldest read
      {path: "b.md", isRead: false}, // Unread
      {path: "c.md", isRead: true, readDate: "2023-01-03T12:00:00Z"}, // Newest read
      {path: "d.md", isRead: true, readDate: "2023-01-02T12:00:00Z"}, // Middle read
      {path: "e.md", isRead: false}, // Unread
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "read_date");
    // Order: Newest read (c), Middle read (d), Oldest read (a), Unread alpha (b, e)
    expect(sortedFiles.map((f) => f.path)).toEqual([
      "c.md",
      "d.md",
      "a.md",
      "b.md",
      "e.md",
    ]);
  });

  test("should handle empty array input", () => {
    expect(sortFilesByReadStatus([], "unread_first")).toEqual([]);
    expect(sortFilesByReadStatus([], "read_date")).toEqual([]);
  });

  test("should handle invalid input (null/undefined/non-array)", () => {
    expect(sortFilesByReadStatus(null, "unread_first")).toEqual([]);
    expect(sortFilesByReadStatus(undefined, "unread_first")).toEqual([]);
    expect(sortFilesByReadStatus({}, "unread_first")).toEqual([]);
  });

  test("should default to alphabetical sort for invalid sort order", () => {
    const testFiles = [
      {path: "c.md", isRead: true},
      {path: "a.md", isRead: false},
      {path: "b.md", isRead: true},
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "invalid_sort");
    expect(sortedFiles.map((f) => f.path)).toEqual(["a.md", "b.md", "c.md"]);
  });

  test("should default to alphabetical sort when sort order is 'alphabet'", () => {
    const testFiles = [
      {path: "c.md", isRead: true},
      {path: "a.md", isRead: false},
      {path: "b.md", isRead: true},
    ];
    const sortedFiles = sortFilesByReadStatus(testFiles, "alphabet");
    expect(sortedFiles.map((f) => f.path)).toEqual(["a.md", "b.md", "c.md"]);
  });

  test("should not modify the original array", () => {
    const testFiles = [
      {path: "b.md", isRead: false},
      {path: "a.md", isRead: true},
    ];
    const originalFiles = [...testFiles]; // Shallow copy
    sortFilesByReadStatus(testFiles, "read_first");
    expect(testFiles).toEqual(originalFiles);
  });
});
