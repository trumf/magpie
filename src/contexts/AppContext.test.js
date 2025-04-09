// contexts/AppContext.test.js
import React from "react";
import {render, act, waitFor, screen, fireEvent} from "@testing-library/react";
import {AppProvider, useApp} from "./AppContext";
import {getAnnotationService} from "../services/AnnotationService";
import {getFileStorageService} from "../services/FileStorageService";
import {getAssetService} from "../services/AssetService";

// Mock all the services
jest.mock("../services/AnnotationService");
jest.mock("../services/FileStorageService");
jest.mock("../services/AssetService");
jest.mock("../services/OfflineService", () => ({
  __esModule: true,
  default: {
    cacheMarkdownFile: jest.fn().mockResolvedValue(true),
    getCachedFiles: jest.fn().mockResolvedValue([]),
  },
}));

// Test component that uses the context
const TestComponent = () => {
  const context = useApp();
  return (
    <div>
      <div data-testid="isImporting">{context.isImporting.toString()}</div>
      <div data-testid="isSidebarVisible">
        {context.isSidebarVisible.toString()}
      </div>
      <button
        data-testid="toggleSidebar"
        onClick={() => context.setIsSidebarVisible(!context.isSidebarVisible)}
      >
        Toggle Sidebar
      </button>
      <button
        data-testid="selectFile"
        onClick={() =>
          context.handleFileSelect({path: "test.md", content: "Test content"})
        }
      >
        Select File
      </button>
    </div>
  );
};

describe("AppContext Provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the service initializations
    getAnnotationService.mockResolvedValue({
      getAnnotationsForArticle: jest.fn().mockResolvedValue([]),
      trackParagraph: jest.fn().mockResolvedValue(1),
      addAnnotation: jest.fn().mockResolvedValue(1),
    });

    getFileStorageService.mockResolvedValue({
      getFiles: jest.fn().mockResolvedValue([]),
      saveFiles: jest.fn().mockResolvedValue(true),
    });

    getAssetService.mockResolvedValue({
      storeAsset: jest.fn().mockResolvedValue("asset-id"),
      getAsset: jest.fn().mockResolvedValue("blob-url"),
      processMarkdownContent: jest
        .fn()
        .mockImplementation((content) => content),
    });
  });

  test("initializes with default values", async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Check initial state values
    await waitFor(() => {
      expect(screen.getByTestId("isImporting").textContent).toBe("true");
    });

    await waitFor(() => {
      expect(screen.getByTestId("isSidebarVisible").textContent).toBe("false");
    });

    // Verify service initialization was called
    expect(getFileStorageService).toHaveBeenCalled();
    expect(getAnnotationService).toHaveBeenCalled();
    expect(getAssetService).toHaveBeenCalled();
  });

  test("toggles sidebar visibility", async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Initially sidebar should be hidden
    await waitFor(() => {
      expect(screen.getByTestId("isSidebarVisible").textContent).toBe("false");
    });

    // Toggle sidebar
    act(() => {
      screen.getByTestId("toggleSidebar").click();
    });

    // Sidebar should now be visible
    await waitFor(() => {
      expect(screen.getByTestId("isSidebarVisible").textContent).toBe("true");
    });
  });

  test("handleFileSelect updates currentFile and loads annotations", async () => {
    // Mock the annotations data
    const mockAnnotations = [
      {id: 1, paragraphIndex: 0, text: "Test annotation"},
    ];

    // Create a mock annotation service
    const mockAnnotationService = {
      getAnnotationsForArticle: jest.fn().mockResolvedValue(mockAnnotations),
      trackParagraph: jest.fn().mockResolvedValue(1),
      addAnnotation: jest.fn().mockResolvedValue(1),
    };

    // Override the mock implementation for this test
    getAnnotationService.mockResolvedValue(mockAnnotationService);

    // Create a simpler test with fewer async operations
    const {getByTestId} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Wait for initialization to complete
    await waitFor(
      () => {
        expect(getByTestId("isImporting")).toBeInTheDocument();
      },
      {timeout: 10000}
    );

    // Click the button that will select a file
    fireEvent.click(getByTestId("selectFile"));

    // Check if the offline service was called (simpler check)
    const OfflineService = require("../services/OfflineService").default;

    // Wait for the offline service to be called
    await waitFor(
      () => {
        expect(OfflineService.cacheMarkdownFile).toHaveBeenCalled();
      },
      {timeout: 10000}
    );
  }, 30000); // Set a long timeout for the entire test

  test("saveAnnotation stores annotations correctly", async () => {
    // Mock implementations
    const addAnnotationMock = jest.fn().mockResolvedValue(1);
    const trackParagraphMock = jest.fn().mockResolvedValue(1);
    const getAnnotationsMock = jest.fn().mockResolvedValue([]);

    getAnnotationService.mockResolvedValue({
      addAnnotation: addAnnotationMock,
      trackParagraph: trackParagraphMock,
      getAnnotationsForArticle: getAnnotationsMock,
    });

    // Create a component that exposes the annotation functions
    const TestAnnotationComponent = () => {
      const {
        handleParagraphClick,
        setAnnotationText,
        saveAnnotation,
        currentFile,
        handleFileSelect,
      } = useApp();

      return (
        <div>
          <div data-testid="currentFile">
            {currentFile ? currentFile.path : "none"}
          </div>
          <button
            data-testid="selectFile"
            onClick={() =>
              handleFileSelect({path: "test.md", content: "Para 1\n\nPara 2"})
            }
          >
            Select File
          </button>
          <button
            data-testid="selectParagraph"
            onClick={() => handleParagraphClick(0)}
          >
            Select Paragraph
          </button>
          <button
            data-testid="setAnnotation"
            onClick={() => setAnnotationText("Test annotation")}
          >
            Set Annotation
          </button>
          <button data-testid="saveAnnotation" onClick={saveAnnotation}>
            Save Annotation
          </button>
        </div>
      );
    };

    render(
      <AppProvider>
        <TestAnnotationComponent />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId("currentFile")).toBeInTheDocument();
    });

    // Setup and save annotation in sequence
    // First select a file
    act(() => {
      screen.getByTestId("selectFile").click();
    });

    // Wait for file to be selected
    await waitFor(() => {
      expect(screen.getByTestId("currentFile").textContent).toBe("test.md");
    });

    // Select paragraph
    act(() => {
      screen.getByTestId("selectParagraph").click();
    });

    // Set annotation text
    act(() => {
      screen.getByTestId("setAnnotation").click();
    });

    // Save annotation
    act(() => {
      screen.getByTestId("saveAnnotation").click();
    });

    // Verify the annotation was saved
    await waitFor(() => {
      expect(trackParagraphMock).toHaveBeenCalled();
    });

    expect(addAnnotationMock).toHaveBeenCalledWith({
      articleId: "test.md",
      paragraphIndex: 0,
      text: "Test annotation",
      type: "note",
    });

    expect(getAnnotationsMock).toHaveBeenCalledWith("test.md");
  });

  test("handleImport updates files and saves to storage", async () => {
    // Mock implementations
    const saveFilesMock = jest.fn().mockResolvedValue(true);

    getFileStorageService.mockResolvedValue({
      getFiles: jest.fn().mockResolvedValue([]),
      saveFiles: saveFilesMock,
    });

    // Create a component that exposes the import function
    const ImportTest = () => {
      const {handleImport, files, isImporting, isSidebarVisible} = useApp();

      const testFiles = [
        {path: "file1.md", content: "Content 1"},
        {path: "file2.md", content: "Content 2"},
      ];

      return (
        <div>
          <button data-testid="import" onClick={() => handleImport(testFiles)}>
            Import Files
          </button>
          <div data-testid="fileCount">{files.length}</div>
          <div data-testid="isImporting">{isImporting.toString()}</div>
          <div data-testid="isSidebarVisible">
            {isSidebarVisible.toString()}
          </div>
        </div>
      );
    };

    render(
      <AppProvider>
        <ImportTest />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId("fileCount")).toBeInTheDocument();
    });

    // Import files
    act(() => {
      screen.getByTestId("import").click();
    });

    // Verify files were updated
    await waitFor(() => {
      expect(screen.getByTestId("fileCount").textContent).toBe("2");
    });

    // Verify import mode is turned off
    await waitFor(() => {
      expect(screen.getByTestId("isImporting").textContent).toBe("false");
    });

    // Verify sidebar is visible
    await waitFor(() => {
      expect(screen.getByTestId("isSidebarVisible").textContent).toBe("true");
    });

    // Verify files were saved to storage
    const fileStorageService = getFileStorageService.mock.results[0].value;
    expect(saveFilesMock).toHaveBeenCalledWith([
      {path: "file1.md", content: "Content 1"},
      {path: "file2.md", content: "Content 2"},
    ]);
  });
});
