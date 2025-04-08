// components/reader/Reader.integration.test.js
import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import Reader from "./Reader";
import {AppProvider} from "../../contexts/AppContext";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";

// Mock the services
jest.mock("../../services/AssetService");
jest.mock("../../services/ImportService");

// Mock the components
jest.mock("../../components/shared/MarkdownRenderer");
jest.mock("./Navigation");
jest.mock("./Import");

// Mock the AppContext
jest.mock("../../contexts/AppContext", () => {
  const originalModule = jest.requireActual("../../contexts/AppContext");

  return {
    ...originalModule,
    useApp: jest.fn(),
  };
});

// Mock the useFileNavigation hook
jest.mock("../../hooks/useFileNavigation", () => ({
  useFileNavigation: jest.fn().mockReturnValue({
    hasNext: true,
    hasPrevious: false,
    navigateNext: jest.fn(),
    navigatePrevious: jest.fn(),
  }),
}));

describe("Reader Component Integration", () => {
  // Mock app context default values
  const mockAppContextValue = {
    isImporting: false,
    currentFile: {
      path: "test-file.md",
      content: "# Test File\n\nThis is a test file.",
    },
    isSidebarVisible: false,
    setIsSidebarVisible: jest.fn(),
    handleFileSelect: jest.fn(),
    files: [
      {path: "test-file.md", name: "test-file.md", type: "file"},
      {path: "another-file.md", name: "another-file.md", type: "file"},
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock for useApp
    useApp.mockReturnValue(mockAppContextValue);
  });

  test("renders import screen when isImporting is true", async () => {
    // Override the default mock value for isImporting
    useApp.mockReturnValue({
      ...mockAppContextValue,
      isImporting: true,
    });

    render(<Reader />);

    // Check for import component elements
    await waitFor(() => {
      expect(screen.getByText(/Import Markdown Files/i)).toBeInTheDocument();
    });
  });

  test("renders empty state when no file is selected", async () => {
    // Override the default mock value
    useApp.mockReturnValue({
      ...mockAppContextValue,
      currentFile: null,
    });

    render(<Reader />);

    // Check for empty state message
    await waitFor(() => {
      expect(
        screen.getByText(
          /Select a file from the navigation menu to start reading/i
        )
      ).toBeInTheDocument();
    });
  });

  test("renders content and navigation when file is selected", async () => {
    // Use default mockAppContextValue
    render(<Reader />);

    // Test the SwipeableContainer presence
    await waitFor(() => {
      expect(screen.getByTestId("swipeable-container")).toBeInTheDocument();
    });

    // Test that ArticleNavigation is present
    await waitFor(() => {
      const nextButtons = screen.getAllByLabelText("Next article");
      expect(nextButtons.length).toBeGreaterThan(0);
    });

    // Test MarkdownRenderer is present
    await waitFor(() => {
      expect(screen.getByTestId("mock-markdown-renderer")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId("mock-markdown-content")).toBeInTheDocument();
    });
  });

  test("toggles sidebar when menu button is clicked", async () => {
    // Mock implementation with tracking of state changes
    const setIsSidebarVisible = jest.fn();
    useApp.mockReturnValue({
      ...mockAppContextValue,
      setIsSidebarVisible,
    });

    render(<Reader />);

    // Find menu button
    let menuButton;
    await waitFor(() => {
      menuButton = screen.getByLabelText("Open menu");
      expect(menuButton).toBeInTheDocument();
    });

    // Click outside of waitFor
    fireEvent.click(menuButton);

    // Check if the state updater was called correctly
    await waitFor(() => {
      expect(setIsSidebarVisible).toHaveBeenCalledWith(true);
    });
  });

  test("navigation works with SwipeableContainer", async () => {
    // Mock the useFileNavigation hook with tracking
    const navigateNext = jest.fn();
    const navigatePrevious = jest.fn();

    useFileNavigation.mockReturnValue({
      hasNext: true,
      hasPrevious: true,
      navigateNext,
      navigatePrevious,
    });

    render(<Reader />);

    // Find the SwipeableContainer
    let container;
    await waitFor(() => {
      container = screen.getByTestId("swipeable-container");
      expect(container).toBeInTheDocument();
    });

    // Simulate a swipe left (outside of waitFor)
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});
    fireEvent.touchMove(container, {touches: [{clientX: 200}]});
    fireEvent.touchEnd(container);

    // Check if navigateNext was called
    await waitFor(() => {
      expect(navigateNext).toHaveBeenCalled();
    });

    // Simulate a swipe right (outside of waitFor)
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});
    fireEvent.touchMove(container, {touches: [{clientX: 800}]});
    fireEvent.touchEnd(container);

    // Check if navigatePrevious was called
    await waitFor(() => {
      expect(navigatePrevious).toHaveBeenCalled();
    });
  });
});
