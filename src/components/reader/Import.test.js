import React from "react";
import {render, screen, waitFor, fireEvent} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Import from "./Import";
import {AppProvider} from "../../contexts/AppContext";
import ImportService from "../../services/ImportService";

// Mock the ImportService
jest.mock("../../services/ImportService", () => ({
  initialize: jest.fn().mockResolvedValue(true),
  isDirectoryPickerSupported: jest.fn().mockReturnValue(true),
  processFiles: jest.fn().mockResolvedValue([]),
  processZipFile: jest.fn().mockResolvedValue([]),
  processDirectory: jest.fn().mockResolvedValue([]),
}));

// Mock the IndexedDB
const indexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: jest.fn(),
    onsuccess: jest.fn(),
    onerror: jest.fn(),
  }),
};

// Mock window.showDirectoryPicker
const mockShowDirectoryPicker = jest.fn();

describe("Import Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock global objects
    global.indexedDB = indexedDB;
    global.window.showDirectoryPicker = mockShowDirectoryPicker;
  });

  it("renders import options", async () => {
    render(
      <AppProvider>
        <Import />
      </AppProvider>
    );

    // Wait for the component to initialize
    await waitFor(() => {
      expect(screen.getByText("Import Markdown Files")).toBeInTheDocument();
    });

    // Check if all import options are rendered
    expect(screen.getByText("Select Markdown Files")).toBeInTheDocument();
    expect(screen.getByText("Upload ZIP Archive")).toBeInTheDocument();
    expect(screen.getByText("Select Folder")).toBeInTheDocument();
  });

  it("handles ZIP file import", async () => {
    // Setup mock to return expected files
    const mockFiles = [
      {
        name: "test.md",
        type: "file",
        path: "test.md",
        content: "# Test Content",
      },
    ];
    ImportService.processZipFile.mockResolvedValueOnce(mockFiles);

    render(
      <AppProvider>
        <Import />
      </AppProvider>
    );

    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByText("Import Markdown Files")).toBeInTheDocument();
    });

    // Create mock ZIP file
    const zipFile = new File(["zip content"], "test.zip", {
      type: "application/zip",
    });
    const zipInput = screen.getByLabelText(/Upload ZIP Archive/i);

    // Simulate file upload
    await userEvent.upload(zipInput, zipFile);

    // Verify the service was called with the file
    await waitFor(() => {
      expect(ImportService.processZipFile).toHaveBeenCalledWith(zipFile);
    });
  });

  it("shows an error message when ZIP processing fails", async () => {
    // Setup mock to throw an error
    const testError = new Error("ZIP processing error");
    ImportService.processZipFile.mockRejectedValueOnce(testError);

    render(
      <AppProvider>
        <Import />
      </AppProvider>
    );

    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByText("Import Markdown Files")).toBeInTheDocument();
    });

    // Create mock ZIP file
    const zipFile = new File(["zip content"], "test.zip", {
      type: "application/zip",
    });
    const zipInput = screen.getByLabelText(/Upload ZIP Archive/i);

    // Simulate file upload
    await userEvent.upload(zipInput, zipFile);

    // Verify error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error processing ZIP/i)).toBeInTheDocument();
    });
  });

  it("handles markdown file imports", async () => {
    // Setup mock to return expected files
    const mockFiles = [
      {
        name: "test.md",
        type: "file",
        path: "test.md",
        content: "# Test Content",
      },
    ];
    ImportService.processFiles.mockResolvedValueOnce(mockFiles);

    render(
      <AppProvider>
        <Import />
      </AppProvider>
    );

    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByText("Import Markdown Files")).toBeInTheDocument();
    });

    // Create mock markdown file
    const mdFile = new File(["# Test"], "test.md", {type: "text/markdown"});
    const fileInput = screen.getByLabelText(/Select Markdown Files/i);

    // Simulate file upload
    await userEvent.upload(fileInput, mdFile);

    // Verify the service was called
    await waitFor(() => {
      expect(ImportService.processFiles).toHaveBeenCalled();
    });

    // Check the files passed to the service
    const calledFiles = ImportService.processFiles.mock.calls[0][0];
    expect(calledFiles[0].name).toBe("test.md");
  });
});
