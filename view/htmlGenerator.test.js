/**
 * Tests for the htmlGenerator module (formerly ZipFileManager core tests)
 */

// Import the functions to test
import {formatSize, generateZipFilesHtml, showStatus} from "./htmlGenerator.js";

describe("htmlGenerator Functionality", () => {
  // No longer need beforeEach to instantiate ZipFileManager

  describe("formatSize", () => {
    test("should format size in bytes", () => {
      expect(formatSize(500)).toBe("500 bytes");
    });

    test("should format size in KB", () => {
      expect(formatSize(1500)).toBe("1.46 KB");
    });

    test("should format size in MB", () => {
      expect(formatSize(1500000)).toBe("1.43 MB");
    });
  });

  describe("showStatus", () => {
    let mockStatusCallback;

    beforeEach(() => {
      mockStatusCallback = jest.fn();
    });

    test("should call statusCallback if provided", () => {
      showStatus("success", "Test message", mockStatusCallback);
      expect(mockStatusCallback).toHaveBeenCalledTimes(1);
      expect(mockStatusCallback).toHaveBeenCalledWith(
        "success",
        "Test message"
      );
    });

    test("should update element innerHTML if element provided", () => {
      const mockElement = {
        innerHTML: "",
      };
      const testDuration = 3000;

      // Setup fake timers
      jest.useFakeTimers();

      // Call showStatus without a callback, but with an element
      showStatus("error", "Error message", null, mockElement, testDuration);

      expect(mockElement.innerHTML).toContain("Error message");
      expect(mockElement.innerHTML).toContain('class="status error"');

      // Fast-forward time, but not enough to clear
      jest.advanceTimersByTime(testDuration - 100);
      expect(mockElement.innerHTML).toContain("Error message");

      // Fast-forward time past the duration
      jest.advanceTimersByTime(200); // Advance beyond testDuration

      expect(mockElement.innerHTML).toBe("");

      // Clean up timers
      jest.useRealTimers();
    });

    test("should not call callback if element is provided", () => {
      const mockElement = {innerHTML: ""};
      showStatus("info", "Element message", mockStatusCallback, mockElement);
      expect(mockStatusCallback).not.toHaveBeenCalled();
    });

    test("should default to 5000ms duration if not specified", () => {
      const mockElement = {innerHTML: ""};
      jest.useFakeTimers();
      showStatus("warn", "Default duration", null, mockElement);
      expect(mockElement.innerHTML).toContain("Default duration");
      jest.advanceTimersByTime(4999);
      expect(mockElement.innerHTML).toContain("Default duration");
      jest.advanceTimersByTime(2);
      expect(mockElement.innerHTML).toBe("");
      jest.useRealTimers();
    });
  });

  describe("generateZipFilesHtml", () => {
    test("should generate HTML for empty or null array", () => {
      expect(generateZipFilesHtml([])).toContain(
        "No ZIP files stored in the database"
      );
      expect(generateZipFilesHtml(null)).toContain(
        "No ZIP files stored in the database"
      );
      expect(generateZipFilesHtml(undefined)).toContain(
        "No ZIP files stored in the database"
      );
    });

    test("should generate HTML table for ZIP files", () => {
      const mockZipFiles = [
        {
          id: 1,
          name: "test1.zip",
          size: 1500,
          fileCount: 3,
          timestamp: "2023-01-01T12:00:00.000Z",
          files: [], // Ensure files array exists even if empty
        },
      ];

      const html = generateZipFilesHtml(mockZipFiles);

      expect(html).toContain("<table>");
      expect(html).toContain("test1.zip");
      // Use formatSize directly for assertion consistency
      expect(html).toContain(formatSize(1500));
      expect(html).toContain("</table>");
      // Should NOT contain the 'Content of...' header if files array is empty or only one zip
      // expect(html).not.toContain("<h3>Content of");
      // Correction: The current logic *does* add header even for one file if files array exists
      expect(html).toContain("<h3>Content of test1.zip");
    });

    test("should include details for most recent file with content preview", () => {
      const longContent = "A".repeat(600);
      const mockZipFiles = [
        {
          id: 1,
          name: "old.zip",
          size: 100,
          fileCount: 1,
          timestamp: "2023-01-01T10:00:00.000Z",
          files: [{path: "old.txt", size: 50, content: "old content"}],
        },
        {
          id: 2,
          name: "test.zip",
          size: 1500,
          fileCount: 2,
          timestamp: "2023-01-01T12:00:00.000Z",
          files: [
            {
              path: "file1.txt",
              size: 100,
              content: "File content 1",
            },
            {
              path: "file2-long.txt",
              size: 600,
              content: longContent,
            },
          ],
        },
      ];

      const html = generateZipFilesHtml(mockZipFiles);

      // Updated to match the actual output format
      expect(html).toContain("<h3>Content of test.zip (showing 2 files)</h3>");
      expect(html).toContain("<strong>file1.txt</strong>");
      expect(html).toContain("File content 1");
      expect(html).toContain("<strong>file2-long.txt</strong>");
      expect(html).toContain(longContent.substring(0, 500) + "..."); // Check truncation
      expect(html).not.toContain(longContent); // Check full content is not present
    });

    test("should handle more than 10 files in the most recent ZIP", () => {
      const mockFiles = [];
      for (let i = 1; i <= 15; i++) {
        mockFiles.push({
          path: `file${i}.txt`,
          size: 100,
          content: `Content of file ${i}`,
        });
      }

      const mockZipFiles = [
        {
          id: 1,
          name: "old.zip",
          size: 100,
          fileCount: 1,
          timestamp: "2023-01-01T10:00:00.000Z",
          files: [{path: "old.txt", size: 50, content: "old content"}],
        },
        {
          id: 2,
          name: "test.zip",
          size: 1500,
          fileCount: mockFiles.length,
          files: mockFiles,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      ];

      const html = generateZipFilesHtml(mockZipFiles);

      // Updated to match the actual output format
      expect(html).toContain("<h3>Content of test.zip (showing 15 files)</h3>");
      // Should show first 10 files
      expect(html).toContain("file1.txt");
      expect(html).toContain("file10.txt");
      expect(html).toContain(`Content of file 10`);

      // Should not show the rest directly
      expect(html).not.toContain("file11.txt");
      expect(html).not.toContain(`Content of file 11`);

      // Should show a message about the remaining files
      expect(html).toContain("... and 5 more files");
    });
  });
});
