// components/shared/SwipeableContainer.test.js
import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import SwipeableContainer from "./SwipeableContainer";

describe("SwipeableContainer Component", () => {
  // Mock the event handlers
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders children correctly", () => {
    render(
      <SwipeableContainer>
        <div data-testid="child-content">Test Content</div>
      </SwipeableContainer>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  test("navigates to next page on swipe left", () => {
    render(
      <SwipeableContainer
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        hasNext={true}
        hasPrevious={true}
      >
        <div>Test Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Touch events for swipe left
    fireEvent.touchStart(container, {touches: [{clientX: 500, clientY: 200}]});
    fireEvent.touchMove(container, {touches: [{clientX: 300, clientY: 200}]});
    fireEvent.touchEnd(container, {
      changedTouches: [{clientX: 300, clientY: 200}],
    });

    expect(mockOnNext).toHaveBeenCalledTimes(1);
    expect(mockOnPrevious).not.toHaveBeenCalled();
  });

  test("navigates to previous page on swipe right", () => {
    render(
      <SwipeableContainer
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        hasNext={true}
        hasPrevious={true}
      >
        <div>Test Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Touch events for swipe right
    fireEvent.touchStart(container, {touches: [{clientX: 300, clientY: 200}]});
    fireEvent.touchMove(container, {touches: [{clientX: 500, clientY: 200}]});
    fireEvent.touchEnd(container, {
      changedTouches: [{clientX: 500, clientY: 200}],
    });

    expect(mockOnPrevious).toHaveBeenCalledTimes(1);
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  test("respects hasNext and hasPrevious props", () => {
    render(
      <SwipeableContainer
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        hasNext={false}
        hasPrevious={false}
      >
        <div>Test Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Try to swipe left (next) when hasNext is false
    fireEvent.touchStart(container, {touches: [{clientX: 500, clientY: 200}]});
    fireEvent.touchMove(container, {touches: [{clientX: 300, clientY: 200}]});
    fireEvent.touchEnd(container, {
      changedTouches: [{clientX: 300, clientY: 200}],
    });

    expect(mockOnNext).not.toHaveBeenCalled();

    // Try to swipe right (previous) when hasPrevious is false
    fireEvent.touchStart(container, {touches: [{clientX: 300, clientY: 200}]});
    fireEvent.touchMove(container, {touches: [{clientX: 500, clientY: 200}]});
    fireEvent.touchEnd(container, {
      changedTouches: [{clientX: 500, clientY: 200}],
    });

    expect(mockOnPrevious).not.toHaveBeenCalled();
  });

  test("allows vertical scrolling without triggering navigation", () => {
    render(
      <SwipeableContainer
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
        hasNext={true}
        hasPrevious={true}
      >
        <div>Test Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Vertical swipe
    fireEvent.touchStart(container, {touches: [{clientX: 300, clientY: 200}]});
    fireEvent.touchMove(container, {touches: [{clientX: 300, clientY: 400}]});
    fireEvent.touchEnd(container, {
      changedTouches: [{clientX: 300, clientY: 400}],
    });

    expect(mockOnNext).not.toHaveBeenCalled();
    expect(mockOnPrevious).not.toHaveBeenCalled();
  });
});
