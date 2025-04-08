// components/shared/SwipeableContainer.test.js
import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import SwipeableContainer from "./SwipeableContainer";

describe("SwipeableContainer Component", () => {
  // Mock the event handlers
  const mockSwipeLeft = jest.fn();
  const mockSwipeRight = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock setTimeout in tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

  test("handles mouse down, move, and up events", () => {
    render(
      <SwipeableContainer
        onSwipeLeft={mockSwipeLeft}
        onSwipeRight={mockSwipeRight}
        canSwipeLeft={true}
        canSwipeRight={true}
      >
        <div>Swipeable Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Simulate mouse down
    fireEvent.mouseDown(container, {clientX: 500});

    // Simulate mouse move to the left (which would trigger a right swipe)
    fireEvent.mouseMove(container, {clientX: 200});

    // Simulate mouse up
    fireEvent.mouseUp(container);

    // Check if the swipe event was triggered
    expect(mockSwipeLeft).toHaveBeenCalledTimes(1);
    expect(mockSwipeRight).not.toHaveBeenCalled();
  });

  test("handles touch events", () => {
    render(
      <SwipeableContainer
        onSwipeLeft={mockSwipeLeft}
        onSwipeRight={mockSwipeRight}
        canSwipeLeft={true}
        canSwipeRight={true}
      >
        <div>Swipeable Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Simulate touch start
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});

    // Simulate touch move to the right (which would trigger a left swipe)
    fireEvent.touchMove(container, {touches: [{clientX: 800}]});

    // Simulate touch end
    fireEvent.touchEnd(container);

    // Check if the swipe event was triggered
    expect(mockSwipeRight).toHaveBeenCalledTimes(1);
    expect(mockSwipeLeft).not.toHaveBeenCalled();
  });

  test("respects canSwipe props", () => {
    render(
      <SwipeableContainer
        onSwipeLeft={mockSwipeLeft}
        onSwipeRight={mockSwipeRight}
        canSwipeLeft={false} // Disable swipe left
        canSwipeRight={true}
      >
        <div>Swipeable Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Simulate touch start
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});

    // Simulate touch move to the left - should be ignored
    fireEvent.touchMove(container, {touches: [{clientX: 200}]});

    // Simulate touch end
    fireEvent.touchEnd(container);

    // No swipe event should be triggered
    expect(mockSwipeLeft).not.toHaveBeenCalled();

    // Now try right swipe which should work
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});
    fireEvent.touchMove(container, {touches: [{clientX: 800}]});
    fireEvent.touchEnd(container);

    expect(mockSwipeRight).toHaveBeenCalledTimes(1);
  });

  test("resets drag state on mouse leave", () => {
    render(
      <SwipeableContainer
        onSwipeLeft={mockSwipeLeft}
        onSwipeRight={mockSwipeRight}
        canSwipeLeft={true}
        canSwipeRight={true}
      >
        <div>Swipeable Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Start dragging
    fireEvent.mouseDown(container, {clientX: 500});

    // Mouse leaves the container
    fireEvent.mouseLeave(container);

    // Finish dragging outside - this shouldn't trigger a swipe
    fireEvent.mouseUp(document.body);

    // No swipe should have been triggered
    expect(mockSwipeLeft).not.toHaveBeenCalled();
    expect(mockSwipeRight).not.toHaveBeenCalled();
  });

  test("cancels swipe if movement is too small", () => {
    render(
      <SwipeableContainer
        onSwipeLeft={mockSwipeLeft}
        onSwipeRight={mockSwipeRight}
        canSwipeLeft={true}
        canSwipeRight={true}
      >
        <div>Swipeable Content</div>
      </SwipeableContainer>
    );

    const container = screen.getByTestId("swipeable-container");

    // Start touch
    fireEvent.touchStart(container, {touches: [{clientX: 500}]});

    // Move just a tiny bit
    fireEvent.touchMove(container, {touches: [{clientX: 520}]});

    // End touch
    fireEvent.touchEnd(container);

    // No swipe should be triggered
    expect(mockSwipeLeft).not.toHaveBeenCalled();
    expect(mockSwipeRight).not.toHaveBeenCalled();
  });
});
