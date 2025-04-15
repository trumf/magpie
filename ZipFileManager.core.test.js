/**
 * Core functionality tests for ZipFileManager module
 */

import {ZipFileManager} from "./ZipFileManager.js";

describe("ZipFileManager Core Functionality", () => {
  let zipManager;

  beforeEach(() => {
    // Create a fresh instance with a mock status callback
    zipManager = new ZipFileManager({
      statusCallback: jest.fn(),
    });
  });

  describe("formatSize", () => {
    test("should format size in bytes", () => {
      expect(zipManager.formatSize(500)).toBe("500 bytes");
    });

    test("should format size in KB", () => {
      expect(zipManager.formatSize(1500)).toBe("1.46 KB");
    });

    test("should format size in MB", () => {
      expect(zipManager.formatSize(1500000)).toBe("1.43 MB");
    });
  });

  describe("showStatus", () => {
    test("should call statusCallback if provided", () => {
      zipManager.showStatus("success", "Test message");
      expect(zipManager.statusCallback.mock.calls.length).toBe(1);
    });

    test("should update element innerHTML if element provided", () => {
      const mockElement = {
        innerHTML: "",
      };

      // Setup fake timers
      jest.useFakeTimers();

      zipManager.statusCallback = null;
      zipManager.showStatus("error", "Error message", mockElement);

      expect(mockElement.innerHTML).toContain("Error message");
      expect(mockElement.innerHTML).toContain('class="status error"');

      // Fast-forward time to clear the status
      jest.advanceTimersByTime(zipManager.config.statusDisplayDuration + 100);

      expect(mockElement.innerHTML).toBe("");

      jest.useRealTimers();
    });
  });

  describe("generateZipFilesHtml", () => {
    test("should generate HTML for empty array", () => {
      const html = zipManager.generateZipFilesHtml([]);
      expect(html).toContain("No ZIP files stored in the database");
    });

    test("should generate HTML table for ZIP files", () => {
      const mockZipFiles = [
        {
          id: 1,
          name: "test1.zip",
          size: 1500,
          fileCount: 3,
          timestamp: "2023-01-01T12:00:00.000Z",
          files: [],
        },
      ];

      const html = zipManager.generateZipFilesHtml(mockZipFiles);

      expect(html).toContain("test1.zip");
      expect(html).toContain("1.46 KB");
    });

    test("should include details for most recent file", () => {
      const mockZipFiles = [
        {
          id: 1,
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
              path: "file2.txt",
              size: 200,
              content: "File content 2",
            },
          ],
        },
      ];

      const html = zipManager.generateZipFilesHtml(mockZipFiles);

      expect(html).toContain("Content of test.zip");
      expect(html).toContain("file1.txt");
      expect(html).toContain("file2.txt");
      expect(html).toContain("File content 1");
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
          name: "test.zip",
          size: 1500,
          fileCount: mockFiles.length,
          files: mockFiles,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      ];

      const html = zipManager.generateZipFilesHtml(mockZipFiles);

      // Should show first 10 files
      expect(html).toContain("file1.txt");
      expect(html).toContain("file10.txt");

      // Should not show the rest
      expect(html).not.toContain("file11.txt");

      // Should show a message about the remaining files
      expect(html).toContain("... and 5 more files");
    });
  });
});
