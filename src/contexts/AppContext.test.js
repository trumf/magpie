// contexts/AppContext.test.js
import React from "react";
import {render, act, waitFor} from "@testing-library/react";
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
    const {getByTestId} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Check initial state values
    await waitFor(() => {
      expect(getByTestId("isImporting").textContent).toBe("true");
      expect(getByTestId("isSidebarVisible").textContent).toBe("false");
    });

    // Verify service initialization was called
    expect(getFileStorageService).toHaveBeenCalled();
    expect(getAnnotationService).toHaveBeenCalled();
    expect(getAssetService).toHaveBeenCalled();
  });

  test("toggles sidebar visibility", async () => {
    const {getByTestId} = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Initially sidebar should be hidden
    await waitFor(() => {
      expect(getByTestId("isSidebarVisible").textContent).toBe("false");
    });

    // Toggle sidebar
    act(() => {
      getByTestId("toggleSidebar").click();
    });

    // Sidebar should now be visible
    await waitFor(() => {
      expect(getByTestId("isSidebarVisible").textContent).toBe("true");
    });
  });

  test("handleFileSelect updates currentFile and loads annotations", async () => {
    // Mock the loadAnnotations function
    const mockAnnotations = [
      {id: 1, paragraphIndex: 0, text: "Test annotation"},
    ];

    getAnnotationService.mockResolvedValue({
      getAnnotationsForArticle: jest.fn().mockResolvedValue(mockAnnotations),
      trackParagraph: jest.fn().mockResolvedValue(1),
      addAnnotation: jest.fn().mockResolvedValue(1),
    });

    // Create a ref to store the context
    const contextRef = React.createRef();

    // Create a component that captures the context
    const ContextCapture = () => {
      const context = useApp();
      contextRef.current = context;
      return null;
    };

    const {getByTestId} = render(
      <AppProvider>
        <ContextCapture />
        <TestComponent />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(contextRef.current).not.toBeNull();
    });

    // Select a file
    act(() => {
      getByTestId("selectFile").click();
    });

    // Wait for file selection to be processed
    await waitFor(() => {
      // Check if currentFile was updated
      expect(contextRef.current.currentFile).toEqual({
        path: "test.md",
        content: "Test content",
      });

      // Check if loadAnnotations was called with the correct path
      const annotationService = getAnnotationService.mock.results[0].value;
      expect(annotationService.getAnnotationsForArticle).toHaveBeenCalledWith(
        "test.md"
      );

      // Check if the file was cached
      const OfflineService = require("../services/OfflineService").default;
      expect(OfflineService.cacheMarkdownFile).toHaveBeenCalledWith({
        path: "test.md",
        content: "Test content",
      });
    });
  });

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
    const AnnotationTest = () => {
      const {
        setSelectedParagraphs,
        setAnnotationText,
        setIsAnnotating,
        saveAnnotation,
        currentFile,
        setCurrentFile,
      } = useApp();

      const setupAndSave = async () => {
        await act(async () => {
          // Setup annotation
          setCurrentFile({path: "test.md", content: "Para 1\n\nPara 2"});
          setSelectedParagraphs(new Set([0]));
          setAnnotationText("Test annotation");
          setIsAnnotating(true);

          // Save annotation
          await saveAnnotation();
        });
      };

      return (
        <div>
          <button data-testid="setupAndSave" onClick={setupAndSave}>
            Setup and Save
          </button>
          <div data-testid="currentFile">
            {currentFile ? currentFile.path : "none"}
          </div>
        </div>
      );
    };

    const {getByTestId} = render(
      <AppProvider>
        <AnnotationTest />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(getByTestId("currentFile")).toBeInTheDocument();
    });

    // Setup and save annotation
    act(() => {
      getByTestId("setupAndSave").click();
    });

    // Verify the annotation was saved
    await waitFor(() => {
      // Check if trackParagraph was called
      expect(trackParagraphMock).toHaveBeenCalled();

      // Check if addAnnotation was called with the correct parameters
      expect(addAnnotationMock).toHaveBeenCalledWith({
        articleId: "test.md",
        paragraphIndex: 0,
        text: "Test annotation",
        type: "note",
      });

      // Check if getAnnotationsForArticle was called to refresh annotations
      expect(getAnnotationsMock).toHaveBeenCalledWith("test.md");
    });
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

      const importFiles = async () => {
        const testFiles = [
          {path: "file1.md", content: "Content 1"},
          {path: "file2.md", content: "Content 2"},
        ];

        await act(async () => {
          await handleImport(testFiles);
        });
      };

      return (
        <div>
          <button data-testid="import" onClick={importFiles}>
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

    const {getByTestId} = render(
      <AppProvider>
        <ImportTest />
      </AppProvider>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(getByTestId("fileCount")).toBeInTheDocument();
    });

    // Import files
    act(() => {
      getByTestId("import").click();
    });

    // Verify the import results
    await waitFor(() => {
      // Files should be updated
      expect(getByTestId("fileCount").textContent).toBe("2");

      // Import mode should be turned off
      expect(getByTestId("isImporting").textContent).toBe("false");

      // Sidebar should be visible
      expect(getByTestId("isSidebarVisible").textContent).toBe("true");

      // Files should be saved to storage
      const fileStorageService = getFileStorageService.mock.results[0].value;
      expect(saveFilesMock).toHaveBeenCalledWith([
        {path: "file1.md", content: "Content 1"},
        {path: "file2.md", content: "Content 2"},
      ]);
    });
  });
});
