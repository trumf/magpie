// components/shared/SwipeableContainer.js
import React, {useState, useRef, useEffect} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import styles from "./SwipeableContainer.module.css";

const SwipeableContainer = ({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft,
  canSwipeRight,
  children,
}) => {
  // State for tracking drag
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reference to starting position and tracking
  const startXRef = useRef(null);
  const thresholdCrossedRef = useRef(false);
  const lastPositionRef = useRef(0);

  // Fixed threshold value
  const THRESHOLD = 250; // Lower threshold for easier triggering

  // Reset the threshold tracking when navigation props change
  useEffect(() => {
    thresholdCrossedRef.current = false;
  }, [canSwipeLeft, canSwipeRight, onSwipeLeft, onSwipeRight]);

  // Function to handle threshold crossing - will trigger navigation immediately
  const checkThreshold = (delta) => {
    // Only check if we haven't crossed threshold yet in this drag
    if (!thresholdCrossedRef.current) {
      if (delta < -THRESHOLD && canSwipeLeft) {
        console.log(
          "LEFT THRESHOLD CROSSED - Triggering navigation immediately"
        );
        thresholdCrossedRef.current = true;

        // Execute navigation
        if (typeof onSwipeLeft === "function") {
          onSwipeLeft();
        }

        // Begin reset of drag state
        resetDrag();
        return true;
      } else if (delta > THRESHOLD && canSwipeRight) {
        console.log(
          "RIGHT THRESHOLD CROSSED - Triggering navigation immediately"
        );
        thresholdCrossedRef.current = true;

        // Execute navigation
        if (typeof onSwipeRight === "function") {
          onSwipeRight();
        }

        // Begin reset of drag state
        resetDrag();
        return true;
      }
    }
    return false;
  };

  // Touch events
  const handleTouchStart = (e) => {
    console.log("Touch start at:", e.touches[0].clientX);
    startXRef.current = e.touches[0].clientX;
    lastPositionRef.current = e.touches[0].clientX;
    thresholdCrossedRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!startXRef.current || !isDragging) return;

    const currentX = e.touches[0].clientX;
    const delta = currentX - startXRef.current;
    lastPositionRef.current = currentX;

    console.log("Touch move delta:", delta);

    // Check if threshold is crossed - if so, this will trigger navigation
    if (checkThreshold(delta)) {
      // Navigation triggered, don't continue processing
      return;
    }

    // Only allow dragging in supported directions if we haven't crossed threshold
    if ((delta < 0 && canSwipeLeft) || (delta > 0 && canSwipeRight)) {
      setDragOffset(delta * 0.5); // Apply resistance factor
    }
  };

  const handleTouchEnd = () => {
    console.log("Touch end event");

    if (!startXRef.current || !isDragging) {
      resetDrag();
      return;
    }

    // Check one last time in case the movement was very rapid
    const delta = lastPositionRef.current - startXRef.current;
    checkThreshold(delta);

    // Always reset drag state on touch end
    resetDrag();
  };

  // Mouse events - similar structure
  const handleMouseDown = (e) => {
    console.log("Mouse down at:", e.clientX);
    startXRef.current = e.clientX;
    lastPositionRef.current = e.clientX;
    thresholdCrossedRef.current = false;
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection
  };

  const handleMouseMove = (e) => {
    if (!startXRef.current || !isDragging) return;

    const delta = e.clientX - startXRef.current;
    lastPositionRef.current = e.clientX;

    console.log("Mouse move delta:", delta);

    // Check if threshold is crossed - if so, this will trigger navigation
    if (checkThreshold(delta)) {
      // Navigation triggered, don't continue processing
      return;
    }

    // Only allow dragging in supported directions if we haven't crossed threshold
    if ((delta < 0 && canSwipeLeft) || (delta > 0 && canSwipeRight)) {
      setDragOffset(delta * 0.5); // Apply resistance factor
    }
  };

  const handleMouseUp = () => {
    console.log("Mouse up event");

    if (!startXRef.current || !isDragging) {
      resetDrag();
      return;
    }

    // Check one last time in case the movement was very rapid
    const delta = lastPositionRef.current - startXRef.current;
    checkThreshold(delta);

    // Always reset drag state on mouse up
    resetDrag();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      console.log("Mouse leave - resetting drag");
      resetDrag();
    }
  };

  const resetDrag = () => {
    startXRef.current = null;
    setIsDragging(false);

    // Delay resetting the offset for visual feedback
    setTimeout(() => {
      setDragOffset(0);
    }, 100);

    console.log("Drag reset");
  };

  // Calculate indicators based on drag progress - for visual feedback
  const leftProgress = dragOffset > 0 ? Math.min(dragOffset / THRESHOLD, 1) : 0;
  const rightProgress =
    dragOffset < 0 ? Math.min(-dragOffset / THRESHOLD, 1) : 0;

  return (
    <div
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      data-testid="swipeable-container"
    >
      {canSwipeRight && (
        <div
          className={styles.leftIndicator}
          style={{
            opacity: leftProgress * 0.8,
            display: dragOffset > 0 ? "flex" : "none",
            transform: `translateX(${leftProgress * 10}px)`, // Subtle animation
          }}
        >
          <ChevronLeft size={24} />
        </div>
      )}

      <div
        className={styles.content}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>

      {canSwipeLeft && (
        <div
          className={styles.rightIndicator}
          style={{
            opacity: rightProgress * 0.8,
            display: dragOffset < 0 ? "flex" : "none",
            transform: `translateX(${rightProgress * -10}px)`, // Subtle animation
          }}
        >
          <ChevronRight size={24} />
        </div>
      )}

      {/* Progress indicator bar - shows how close to threshold */}
      {canSwipeLeft && dragOffset < 0 && (
        <div
          className={styles.progressIndicator}
          style={{
            width: `${rightProgress * 100}%`,
            right: 0,
            background: "var(--color-primary)",
          }}
        />
      )}

      {canSwipeRight && dragOffset > 0 && (
        <div
          className={styles.progressIndicator}
          style={{
            width: `${leftProgress * 100}%`,
            left: 0,
            background: "var(--color-primary)",
          }}
        />
      )}
    </div>
  );
};

export default SwipeableContainer;
