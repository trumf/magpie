import ImportService from "./ImportService";
import JSZip from "jszip";
import {jest} from "@jest/globals";

// Mock AssetService
jest.mock("./AssetService", () => {
  const assetServiceMock = {
    storeAsset: jest.fn().mockImplementation(async ({name}) => {
      return `mock_asset_id_${name}`;
    }),
    processMarkdownContent: jest
      .fn()
      .mockImplementation((content, assetMap) => {
        // Simple implementation that just replaces image references
        // with their mapped asset IDs
        let processedContent = content;
        Object.entries(assetMap).forEach(([path, assetId]) => {
          // Replace image references that match the path or filename
          const regex = new RegExp(`\\!\\[(.*)\\]\\(${path}\\)`, "g");
          processedContent = processedContent.replace(regex, `![](${assetId})`);
        });
        return processedContent;
      }),
  };

  return {
    getAssetService: jest.fn().mockResolvedValue(assetServiceMock),
  };
});

describe("ImportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset and initialize the ImportService
    ImportService.assetService = null;
    ImportService.initPromise = null;
  });

  describe("processZipFile", () => {
    it("should process a ZIP file with markdown files", async () => {
      // Create a test ZIP file with markdown content
      const zip = new JSZip();
      zip.file("test.md", "# Test Markdown");
      const zipBlob = await zip.generateAsync({type: "blob"});

      // Create a File object from the Blob
      const zipFile = new File([zipBlob], "test.zip", {
        type: "application/zip",
      });

      // Process the ZIP file
      const result = await ImportService.processZipFile(zipFile);

      // Verify the result
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe("test.md");
      expect(result[0].content).toBe("# Test Markdown");
      expect(result[0].type).toBe("file");
    });

    it("should process a ZIP file with nested directories", async () => {
      // Create a test ZIP with nested directories
      const zip = new JSZip();
      zip.file("README.md", "# Main README");
      zip.file("docs/guide.md", "# User Guide");
      zip.file("docs/api/reference.md", "# API Reference");

      const zipBlob = await zip.generateAsync({type: "blob"});
      const zipFile = new File([zipBlob], "project.zip", {
        type: "application/zip",
      });

      // Process the ZIP
      const result = await ImportService.processZipFile(zipFile);

      // There should be directories and files in the result
      const directoryNames = result
        .filter((item) => item.type === "directory")
        .map((dir) => dir.name);

      // Check directories
      expect(directoryNames).toContain("docs");
      expect(directoryNames).toContain("api");

      // Check files presence and structure
      const fileNames = result
        .filter((item) => item.type === "file")
        .map((file) => file.name);

      expect(fileNames).toContain("README.md");
      expect(fileNames).toContain("guide.md");
      expect(fileNames).toContain("reference.md");
    });

    it("should handle assets in a ZIP file", async () => {
      // Create a ZIP with markdown and image assets
      const zip = new JSZip();

      // Add markdown with image reference
      const markdownContent = `# Document with Image\n\n![Test](images/test.png)`;
      zip.file("doc.md", markdownContent);

      // Add image file
      const imageBuffer = new ArrayBuffer(10); // Dummy image data
      zip.file("images/test.png", imageBuffer);

      const zipBlob = await zip.generateAsync({type: "blob"});
      const zipFile = new File([zipBlob], "with-images.zip", {
        type: "application/zip",
      });

      // Process the ZIP file
      const result = await ImportService.processZipFile(zipFile);

      // Verify the content has been processed
      const markdownFile = result.find((file) => file.name === "doc.md");
      expect(markdownFile).toBeDefined();

      // The processed content should have replaced the image reference
      // with the mock asset ID from our mock AssetService
      expect(markdownFile.content).toContain("mock_asset_id_test.png");
      expect(markdownFile.content).not.toContain("images/test.png");
    });

    it("should handle errors gracefully", async () => {
      // Mock the JSZip to throw an error
      const originalLoadAsync = JSZip.prototype.loadAsync;
      JSZip.prototype.loadAsync = jest
        .fn()
        .mockRejectedValue(new Error("Invalid ZIP file"));

      // Create a dummy file
      const dummyFile = new File(["not a real zip"], "broken.zip", {
        type: "application/zip",
      });

      // Process should not throw, but return an empty array
      const result = await ImportService.processZipFile(dummyFile);

      // Verify the result (should be empty array or proper error handling)
      expect(result).toEqual([]);

      // Restore original implementation
      JSZip.prototype.loadAsync = originalLoadAsync;
    });
  });
});
