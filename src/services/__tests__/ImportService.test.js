import ImportService from "../ImportService";
import {getAssetService} from "../AssetService";
import JSZip from "jszip";

// Mock the AssetService module
jest.mock("../AssetService");

describe("ImportService", () => {
  beforeEach(() => {
    // Setup the mock implementation for each test
    const mockAssetService = {
      storeAsset: jest.fn().mockImplementation(async ({name, originalPath}) => {
        return `mock_asset_id_${originalPath || name}`;
      }),
      processMarkdownContent: jest
        .fn()
        .mockImplementation((content, assetMap) => {
          // Simple mock implementation that replaces image references
          let processedContent = content;
          Object.entries(assetMap).forEach(([path, assetId]) => {
            const regex = new RegExp(
              `!\\[.*?\\]\\(${path.replace(/\//g, "\\/")}\\)`,
              "g"
            );
            processedContent = processedContent.replace(
              regex,
              `![](${assetId})`
            );
          });
          return processedContent;
        }),
    };

    // Configure the mock to return our mock implementation
    getAssetService.mockResolvedValue(mockAssetService);

    // Reset ImportService state for each test
    ImportService.assetService = null;
    ImportService.initPromise = null;

    // Clear all mock calls
    jest.clearAllMocks();
  });

  test("should initialize correctly", async () => {
    await ImportService.initialize();
    expect(getAssetService).toHaveBeenCalled();
  });

  test("should process a simple zip file with markdown", async () => {
    // Initialize the service first
    await ImportService.initialize();

    // Create a test ZIP file with a single markdown file
    const zip = new JSZip();
    const markdownContent = "# Test Document\n\nThis is a test.";
    zip.file("test.md", markdownContent);

    // Generate the ZIP as a blob
    const zipBlob = await zip.generateAsync({type: "blob"});
    const zipFile = new File([zipBlob], "test.zip", {type: "application/zip"});

    // Process the ZIP
    const result = await ImportService.processZipFile(zipFile);

    // Verify the result
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("test.md");
  });

  test("should process a zip file with nested directories and assets", async () => {
    // Initialize the service
    await ImportService.initialize();

    // Create a complex ZIP file structure
    const zip = new JSZip();

    // Add files to root
    zip.file(
      "README.md",
      "# Project Documentation\n\nMain documentation index."
    );

    // Add files to nested directories
    zip.folder("docs");
    zip.file(
      "docs/api.md",
      "# API Reference\n\nAPI documentation with an image: ![API diagram](../images/api.png)"
    );
    zip.file(
      "docs/getting-started.md",
      "# Getting Started\n\nGet started with our software."
    );

    // Add a subfolder with more files
    zip.folder("docs/examples");
    zip.file("docs/examples/basic.md", "# Basic Example\n\nA basic example.");

    // Add images folder with image assets
    zip.folder("images");
    // Create a simple "image" data
    const imageData = new ArrayBuffer(10);
    zip.file("images/api.png", imageData);

    // Generate the ZIP as a blob
    const zipBlob = await zip.generateAsync({type: "blob"});
    const zipFile = new File([zipBlob], "documentation.zip", {
      type: "application/zip",
    });

    // Process the ZIP
    const result = await ImportService.processZipFile(zipFile);

    // Verify we have items in the result
    expect(result.length).toBeGreaterThan(0);

    // Verify the asset service was called to store the image
    const mockAssetService = await getAssetService();
    expect(mockAssetService.storeAsset).toHaveBeenCalled();

    // Verify there are markdown files in the result
    // The file names and paths will depend on the actual implementation
    const markdownFiles = result.filter(
      (file) => file.type === "file" && file.name.endsWith(".md")
    );
    expect(markdownFiles.length).toBeGreaterThan(0);

    // Check that at least one of the markdown files contains our expected content
    const hasReadmeContent = markdownFiles.some(
      (file) => file.content && file.content.includes("Project Documentation")
    );
    expect(hasReadmeContent).toBeTruthy();
  });
});
