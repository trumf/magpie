import {renderHook, act} from "@testing-library/react-hooks";
import {useFileNavigation} from "./useFileNavigation";
import {useApp} from "../contexts/AppContext";
import NavigationService from "../services/NavigationService";

// Mock the dependencies
jest.mock("../contexts/AppContext");
jest.mock("../services/NavigationService");

describe("useFileNavigation Hook", () => {
  // Sample navigation state to be returned by NavigationService
  const mockNavigationState = {
    currentIndex: 1,
    hasNext: true,
    hasPrevious: true,
    nextFile: {path: "next-file.md", name: "next-file.md"},
    previousFile: {path: "prev-file.md", name: "prev-file.md"},
  };

  // Mock file data
  const mockFiles = [
    {path: "prev-file.md", name: "prev-file.md"},
    {path: "current-file.md", name: "current-file.md"},
    {path: "next-file.md", name: "next-file.md"},
  ];

  const mockCurrentFile = {path: "current-file.md", name: "current-file.md"};
  const mockHandleFileSelect = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup useApp mock
    useApp.mockReturnValue({
      files: mockFiles,
      currentFile: mockCurrentFile,
      handleFileSelect: mockHandleFileSelect,
    });

    // Setup NavigationService mock
    NavigationService.getNavigationState.mockReturnValue(mockNavigationState);
  });

  test("returns correct navigation state from NavigationService", () => {
    const {result} = renderHook(() => useFileNavigation());

    // Verify NavigationService was called with correct parameters
    expect(NavigationService.getNavigationState).toHaveBeenCalledWith(
      mockFiles,
      mockCurrentFile.path
    );

    // Verify hook returns correct state
    expect(result.current.currentIndex).toBe(mockNavigationState.currentIndex);
    expect(result.current.hasNext).toBe(mockNavigationState.hasNext);
    expect(result.current.hasPrevious).toBe(mockNavigationState.hasPrevious);
    expect(result.current.nextFile).toBe(mockNavigationState.nextFile);
    expect(result.current.previousFile).toBe(mockNavigationState.previousFile);
  });

  test("navigateNext calls handleFileSelect with next file when available", () => {
    const {result} = renderHook(() => useFileNavigation());

    act(() => {
      result.current.navigateNext();
    });

    expect(mockHandleFileSelect).toHaveBeenCalledWith(
      mockNavigationState.nextFile
    );
  });

  test("navigatePrevious calls handleFileSelect with previous file when available", () => {
    const {result} = renderHook(() => useFileNavigation());

    act(() => {
      result.current.navigatePrevious();
    });

    expect(mockHandleFileSelect).toHaveBeenCalledWith(
      mockNavigationState.previousFile
    );
  });

  test("does not navigate when next file is not available", () => {
    // Override the mock to indicate no next file
    NavigationService.getNavigationState.mockReturnValueOnce({
      ...mockNavigationState,
      hasNext: false,
      nextFile: null,
    });

    const {result} = renderHook(() => useFileNavigation());

    act(() => {
      result.current.navigateNext();
    });

    expect(mockHandleFileSelect).not.toHaveBeenCalled();
  });

  test("does not navigate when previous file is not available", () => {
    // Override the mock to indicate no previous file
    NavigationService.getNavigationState.mockReturnValueOnce({
      ...mockNavigationState,
      hasPrevious: false,
      previousFile: null,
    });

    const {result} = renderHook(() => useFileNavigation());

    act(() => {
      result.current.navigatePrevious();
    });

    expect(mockHandleFileSelect).not.toHaveBeenCalled();
  });

  test("returns updated navigation when dependencies change", () => {
    const {rerender} = renderHook(() => useFileNavigation());

    // First call should use the default mock
    expect(NavigationService.getNavigationState).toHaveBeenCalledTimes(1);

    // Change the current file
    const newCurrentFile = {path: "new-file.md", name: "new-file.md"};
    useApp.mockReturnValue({
      files: mockFiles,
      currentFile: newCurrentFile,
      handleFileSelect: mockHandleFileSelect,
    });

    // Update the navigation mock for the new file
    const newNavigationState = {
      currentIndex: 2,
      hasNext: false,
      hasPrevious: true,
      nextFile: null,
      previousFile: mockCurrentFile,
    };
    NavigationService.getNavigationState.mockReturnValue(newNavigationState);

    // Rerender the hook
    rerender();

    // Verify NavigationService was called again with new parameters
    expect(NavigationService.getNavigationState).toHaveBeenCalledTimes(2);
    expect(NavigationService.getNavigationState).toHaveBeenLastCalledWith(
      mockFiles,
      newCurrentFile.path
    );
  });
});
