// components/reader/Reader.integration.test.js
import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import Reader from "./Reader";
import {AppProvider} from "../../contexts/AppContext";

// Mock the services
jest.mock("../../services/AssetService");
jest.mock("../../services/ImportService");

// Mock the components
jest.mock("../../components/shared/MarkdownRenderer");
jest.mock("./Navigation", () => require("./__mocks__/Navigation"));
jest.mock("./Import", () => require("./__mocks__/Import"));

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

// Import the mocked hooks and components
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";

// Create a custom render function that includes the AppProvider
const renderWithProvider = (ui, providerProps = {}) => {
  return render(<AppProvider {...providerProps}>{ui}</AppProvider>);
};

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

    // Wait for content to be rendered
    await waitFor(() => {
      // The SwipeableContainer should be rendered
      expect(screen.getByTestId("swipeable-container")).toBeInTheDocument();

      // The ArticleNavigation component should be rendered - use getAllByLabelText and check length
      const nextButtons = screen.getAllByLabelText("Next article");
      expect(nextButtons.length).toBeGreaterThan(0);

      // The mocked MarkdownRenderer should be rendered
      expect(screen.getByTestId("mock-markdown-renderer")).toBeInTheDocument();
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

    // Find and click the menu button in the header
    await waitFor(() => {
      const menuButton = screen.getByLabelText("Open menu");
      fireEvent.click(menuButton);

      // Check if the state updater was called correctly
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
    const container = screen.getByTestId("swipeable-container");

    // Simulate a swipe left
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});
    fireEvent.touchMove(container, {touches: [{clientX: 200}]});
    fireEvent.touchEnd(container);

    // Check if navigateNext was called
    expect(navigateNext).toHaveBeenCalled();

    // Simulate a swipe right
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});
    fireEvent.touchMove(container, {touches: [{clientX: 800}]});
    fireEvent.touchEnd(container);

    // Check if navigatePrevious was called
    expect(navigatePrevious).toHaveBeenCalled();
  });
});
