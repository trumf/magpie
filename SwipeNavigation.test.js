// SwipeNavigation.test.js
import {jest} from "@jest/globals";

// Mock the dependencies needed by the module
const mockArticleNavigator = {
  getPreviousArticle: jest.fn(),
  getNextArticle: jest.fn(),
};

const mockDisplayFileCallback = jest.fn();
const mockUpdateSidebarCallback = jest.fn();

// Dynamically import the module to test AFTER mocks are set up
let SwipeNavigation;
let handleSwipeGestureInternal;
let configInternal;
let setTestCoordsHelper; // To hold the imported helper

beforeAll(async () => {
  // Mock process.env.NODE_ENV before importing the module
  // This ensures the __setTestCoords function will work.
  process.env.NODE_ENV = "test";
  SwipeNavigation = await import("./SwipeNavigation.js");
  handleSwipeGestureInternal = SwipeNavigation.handleSwipeGesture;
  configInternal = SwipeNavigation.testConfig; // Access internal config for setup
  setTestCoordsHelper = SwipeNavigation.__setTestCoords; // Get the helper
  // Reset NODE_ENV if it affects other tests (though Jest usually isolates)
  // delete process.env.NODE_ENV;
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();

  // Set up the internal config for the module before each test
  configInternal.articleNavigator = mockArticleNavigator;
  configInternal.displayFileCallback = mockDisplayFileCallback;
  configInternal.updateSidebarCallback = mockUpdateSidebarCallback;

  // Reset coordinates using the helper before each test
  setTestCoordsHelper(0, 0, 0, 0);
});

describe("SwipeNavigation handleSwipeGesture", () => {
  const startX = 100;
  const startY = 100;
  const swipeThreshold = 50; // As defined in the module

  test("should call getNextArticle on swipe left (significant horizontal)", () => {
    const endX = startX - swipeThreshold - 10; // Swipe left
    const endY = startY + 10; // Minimal vertical change
    const mockNextArticle = {path: "next.md"};
    mockArticleNavigator.getNextArticle.mockReturnValue(mockNextArticle);

    // Set internal coords for handleSwipeGesture to use via helper
    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    expect(mockArticleNavigator.getNextArticle).toHaveBeenCalledTimes(1);
    expect(mockArticleNavigator.getPreviousArticle).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).toHaveBeenCalledWith(mockNextArticle);
    expect(mockDisplayFileCallback).toHaveBeenCalledWith(mockNextArticle);
  });

  test("should call getPreviousArticle on swipe right (significant horizontal)", () => {
    const endX = startX + swipeThreshold + 10; // Swipe right
    const endY = startY - 10; // Minimal vertical change
    const mockPrevArticle = {path: "prev.md"};
    mockArticleNavigator.getPreviousArticle.mockReturnValue(mockPrevArticle);

    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    expect(mockArticleNavigator.getPreviousArticle).toHaveBeenCalledTimes(1);
    expect(mockArticleNavigator.getNextArticle).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).toHaveBeenCalledWith(mockPrevArticle);
    expect(mockDisplayFileCallback).toHaveBeenCalledWith(mockPrevArticle);
  });

  test("should NOT navigate on vertical swipe", () => {
    const endX = startX + 10; // Minimal horizontal change
    const endY = startY + swipeThreshold + 10; // Swipe down

    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    expect(mockArticleNavigator.getPreviousArticle).not.toHaveBeenCalled();
    expect(mockArticleNavigator.getNextArticle).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).not.toHaveBeenCalled();
    expect(mockDisplayFileCallback).not.toHaveBeenCalled();
  });

  test("should NOT navigate if swipe distance is too small", () => {
    const endX = startX - (swipeThreshold - 10); // Swipe left but not enough
    const endY = startY;

    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    expect(mockArticleNavigator.getPreviousArticle).not.toHaveBeenCalled();
    expect(mockArticleNavigator.getNextArticle).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).not.toHaveBeenCalled();
    expect(mockDisplayFileCallback).not.toHaveBeenCalled();
  });

  test("should NOT navigate if articleNavigator is not configured", () => {
    configInternal.articleNavigator = null; // Simulate missing config
    const endX = startX - swipeThreshold - 10;
    const endY = startY;

    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    expect(mockArticleNavigator.getNextArticle).not.toHaveBeenCalled(); // Mock object wasn't called
    expect(mockDisplayFileCallback).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).not.toHaveBeenCalled();
  });

  test("should NOT navigate if displayFileCallback is not configured", () => {
    configInternal.displayFileCallback = null; // Simulate missing config
    const endX = startX - swipeThreshold - 10;
    const endY = startY;
    // We don't even need to mock the return value since it shouldn't be called
    // mockArticleNavigator.getNextArticle.mockReturnValue({ path: "next.md" });

    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    // Expect that the navigator method was NOT called due to early return
    expect(mockArticleNavigator.getNextArticle).not.toHaveBeenCalled();
    expect(mockDisplayFileCallback).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).not.toHaveBeenCalled();
  });

  test("should NOT navigate if updateSidebarCallback is not configured", () => {
    configInternal.updateSidebarCallback = null; // Simulate missing config
    const endX = startX - swipeThreshold - 10;
    const endY = startY;
    // We don't even need to mock the return value here either
    // mockArticleNavigator.getNextArticle.mockReturnValue({ path: "next.md" });

    setTestCoordsHelper(startX, startY, endX, endY);

    handleSwipeGestureInternal();

    // Expect that the navigator method was NOT called due to early return
    expect(mockArticleNavigator.getNextArticle).not.toHaveBeenCalled();
    expect(mockUpdateSidebarCallback).not.toHaveBeenCalled();
    expect(mockDisplayFileCallback).not.toHaveBeenCalled();
  });
});
