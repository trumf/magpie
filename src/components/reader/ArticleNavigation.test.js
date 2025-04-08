import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import ArticleNavigation from "./ArticleNavigation";

// Mock the useFileNavigation hook
jest.mock("../../hooks/useFileNavigation", () => ({
  useFileNavigation: jest.fn(),
}));

describe("ArticleNavigation Component", () => {
  const {useFileNavigation} = require("../../hooks/useFileNavigation");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nothing when no navigation is possible", () => {
    useFileNavigation.mockReturnValue({
      hasNext: false,
      hasPrevious: false,
    });

    render(<ArticleNavigation />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("renders only previous button when only previous navigation is possible", () => {
    useFileNavigation.mockReturnValue({
      hasNext: false,
      hasPrevious: true,
      navigatePrevious: jest.fn(),
    });

    render(<ArticleNavigation />);

    const previousButton = screen.getByLabelText("Previous article");
    expect(previousButton).toBeInTheDocument();
    expect(screen.queryByLabelText("Next article")).not.toBeInTheDocument();
  });

  test("renders only next button when only next navigation is possible", () => {
    useFileNavigation.mockReturnValue({
      hasNext: true,
      hasPrevious: false,
      navigateNext: jest.fn(),
    });

    render(<ArticleNavigation />);

    const nextButton = screen.getByLabelText("Next article");
    expect(nextButton).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous article")).not.toBeInTheDocument();
  });

  test("renders both buttons when both navigations are possible", () => {
    useFileNavigation.mockReturnValue({
      hasNext: true,
      hasPrevious: true,
      navigateNext: jest.fn(),
      navigatePrevious: jest.fn(),
    });

    render(<ArticleNavigation />);

    expect(screen.getByLabelText("Previous article")).toBeInTheDocument();
    expect(screen.getByLabelText("Next article")).toBeInTheDocument();
  });

  test("calls navigatePrevious when previous button is clicked", () => {
    const mockNavigatePrevious = jest.fn();
    useFileNavigation.mockReturnValue({
      hasNext: false,
      hasPrevious: true,
      navigatePrevious: mockNavigatePrevious,
    });

    render(<ArticleNavigation />);

    fireEvent.click(screen.getByLabelText("Previous article"));
    expect(mockNavigatePrevious).toHaveBeenCalledTimes(1);
  });

  test("calls navigateNext when next button is clicked", () => {
    const mockNavigateNext = jest.fn();
    useFileNavigation.mockReturnValue({
      hasNext: true,
      hasPrevious: false,
      navigateNext: mockNavigateNext,
    });

    render(<ArticleNavigation />);

    fireEvent.click(screen.getByLabelText("Next article"));
    expect(mockNavigateNext).toHaveBeenCalledTimes(1);
  });

  test("handles button text display correctly", () => {
    useFileNavigation.mockReturnValue({
      hasNext: true,
      hasPrevious: true,
      navigateNext: jest.fn(),
      navigatePrevious: jest.fn(),
    });

    render(<ArticleNavigation />);

    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
