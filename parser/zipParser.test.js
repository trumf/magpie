/**
 * Tests for the zipParser module.
 */
import {parseZipFile} from "./zipParser.js";
import {extractDisplayName} from "../HeadlineExtraction.js"; // We need this for mocking

// --- Mocks ---

// Mock extractDisplayName as it's an external dependency for the parser
jest.mock("../HeadlineExtraction.js", () => ({
  extractDisplayName: jest.fn((content, path) => `Mocked: ${path}`), // Simple mock implementation
}));

// Mock FileReader
const mockFileReader = {
  readAsArrayBuffer: jest.fn(),
  onload: null,
  onerror: null,
  result: null, // This will hold the mock ArrayBuffer
};
global.FileReader = jest.fn(() => mockFileReader);

// Mock JSZip
const mockZipEntry = {
  async: jest.fn(), // Mock the async method used to get content
  dir: false, // Default to file, override in tests for directories
};
const mockZip = {
  loadAsync: jest.fn(),
  files: {}, // This will hold mock file entries
};
global.JSZip = jest.fn(() => mockZip);

// Helper to simulate FileReader load
function simulateFileReaderLoad(arrayBuffer) {
  mockFileReader.result = arrayBuffer;
  if (mockFileReader.onload) {
    mockFileReader.onload({target: mockFileReader});
  }
}

// Helper to simulate FileReader error
function simulateFileReaderError(error) {
  if (mockFileReader.onerror) {
    mockFileReader.onerror({target: {error}});
  }
}

// --- Test Suite ---

describe("zipParser", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockFileReader.onload = null;
    mockFileReader.onerror = null;
    mockFileReader.result = null;
    mockZip.files = {};
    // Provide a default resolved value for loadAsync to avoid pending promises
    mockZip.loadAsync.mockResolvedValue(mockZip);
  });

  test("should parse a simple zip file correctly", async () => {
    // Arrange
    const mockFile = new File(["dummy content"], "test.zip", {
      type: "application/zip",
    });
    const mockArrayBuffer = new ArrayBuffer(10); // Dummy buffer
    const mockFileContent = "File 1 content";

    // Mock JSZip interactions
    mockZip.files = {
      "file1.txt": {
        ...mockZipEntry,
        async: jest.fn().mockResolvedValue(mockFileContent),
        dir: false,
      },
    };
    mockZip.loadAsync.mockResolvedValue(mockZip); // Ensure loadAsync resolves

    // Act
    const parsePromise = parseZipFile(mockFile);
    // Need to simulate the async FileReader load *after* calling parseZipFile
    simulateFileReaderLoad(mockArrayBuffer);
    const zipData = await parsePromise;

    // Assert
    expect(FileReader).toHaveBeenCalledTimes(1);
    expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(mockFile);
    expect(JSZip).toHaveBeenCalledTimes(1);
    expect(mockZip.loadAsync).toHaveBeenCalledWith(mockArrayBuffer);
    expect(mockZip.files["file1.txt"].async).toHaveBeenCalledWith("string");

    expect(zipData.name).toBe("test.zip");
    expect(zipData.size).toBe(mockFile.size);
    expect(zipData.fileCount).toBe(1);
    expect(zipData.totalSize).toBe(mockFileContent.length);
    expect(zipData.files).toHaveLength(1);
    expect(zipData.files[0].path).toBe("file1.txt");
    expect(zipData.files[0].content).toBe(mockFileContent);
    expect(zipData.files[0].size).toBe(mockFileContent.length);
    expect(zipData.files[0].displayName).toBe("file1.txt"); // Non-markdown
    expect(extractDisplayName).not.toHaveBeenCalled(); // Not called for non-md
  });

  test("should parse a zip with markdown file and call extractDisplayName", async () => {
    // Arrange
    const mockFile = new File(["dummy content"], "docs.zip", {
      type: "application/zip",
    });
    const mockArrayBuffer = new ArrayBuffer(10);
    const mockMdContent = "# Hello World\nThis is markdown.";

    mockZip.files = {
      "doc.md": {
        ...mockZipEntry,
        async: jest.fn().mockResolvedValue(mockMdContent),
        dir: false,
      },
    };
    mockZip.loadAsync.mockResolvedValue(mockZip);

    // Act
    const parsePromise = parseZipFile(mockFile);
    simulateFileReaderLoad(mockArrayBuffer);
    const zipData = await parsePromise;

    // Assert
    expect(zipData.fileCount).toBe(1);
    expect(zipData.files[0].path).toBe("doc.md");
    expect(zipData.files[0].content).toBe(mockMdContent);
    expect(extractDisplayName).toHaveBeenCalledTimes(1);
    expect(extractDisplayName).toHaveBeenCalledWith(mockMdContent, "doc.md");
    expect(zipData.files[0].displayName).toBe("Mocked: doc.md"); // From our mock
  });

  test("should ignore directories", async () => {
    // Arrange
    const mockFile = new File(["dummy"], "archive.zip");
    const mockArrayBuffer = new ArrayBuffer(5);
    mockZip.files = {
      "folder/": {...mockZipEntry, dir: true}, // Directory entry
      "folder/file.txt": {
        ...mockZipEntry,
        async: jest.fn().mockResolvedValue("text"),
        dir: false,
      },
    };
    mockZip.loadAsync.mockResolvedValue(mockZip);

    // Act
    const parsePromise = parseZipFile(mockFile);
    simulateFileReaderLoad(mockArrayBuffer);
    const zipData = await parsePromise;

    // Assert
    expect(zipData.fileCount).toBe(1); // Only the file should be counted
    expect(zipData.files).toHaveLength(1);
    expect(zipData.files[0].path).toBe("folder/file.txt");
  });

  test("should reject if FileReader errors", async () => {
    // Arrange
    const mockFile = new File(["dummy"], "error.zip");
    const readerError = new Error("FileReader failed");

    // Act
    const parsePromise = parseZipFile(mockFile);
    simulateFileReaderError(readerError); // Simulate error *after* call

    // Assert
    await expect(parsePromise).rejects.toThrow("FileReader failed");
    expect(mockZip.loadAsync).not.toHaveBeenCalled();
  });

  test("should reject if JSZip loadAsync errors", async () => {
    // Arrange
    const mockFile = new File(["dummy"], "badzip.zip");
    const mockArrayBuffer = new ArrayBuffer(5);
    const zipError = new Error("JSZip failed to load");
    mockZip.loadAsync.mockRejectedValue(zipError); // Make loadAsync fail

    // Act
    const parsePromise = parseZipFile(mockFile);
    simulateFileReaderLoad(mockArrayBuffer); // Simulate reader success

    // Assert
    await expect(parsePromise).rejects.toThrow("JSZip failed to load");
  });

  test("should reject if JSZip entry async errors", async () => {
    // Arrange
    const mockFile = new File(["dummy"], "corrupt_entry.zip");
    const mockArrayBuffer = new ArrayBuffer(5);
    const entryError = new Error("Cannot read entry");
    mockZip.files = {
      "badfile.txt": {
        ...mockZipEntry,
        async: jest.fn().mockRejectedValue(entryError), // Make reading this entry fail
        dir: false,
      },
    };
    mockZip.loadAsync.mockResolvedValue(mockZip);

    // Act
    const parsePromise = parseZipFile(mockFile);
    simulateFileReaderLoad(mockArrayBuffer);

    // Assert
    await expect(parsePromise).rejects.toThrow("Cannot read entry");
  });
});
