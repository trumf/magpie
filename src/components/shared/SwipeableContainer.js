// components/shared/SwipeableContainer.js
import React, {useState, useRef} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import styles from "./SwipeableContainer.module.css";

const SwipeableContainer = ({
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  children,
}) => {
  // If not provided, default the handlers and flags
  const handleNext = onNext || (() => {});
  const handlePrevious = onPrevious || (() => {});

  // State to track swipe
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(null);

  // Track current position during swipe
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Handle touch start
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsHorizontalSwipe(null);
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (touchStartX === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX - currentX;
    const diffY = touchStartY - currentY;

    // On first move, determine if this is a horizontal or vertical swipe
    if (isHorizontalSwipe === null) {
      const isHorizontal = Math.abs(diffX) > Math.abs(diffY);
      setIsHorizontalSwipe(isHorizontal);
    }

    // Only apply visual feedback for horizontal swipes
    if (isHorizontalSwipe) {
      // Apply resistance at edges
      if ((diffX > 0 && hasNext) || (diffX < 0 && hasPrevious)) {
        setSwipeOffset(-diffX * 0.5); // Visual feedback for the swipe
      }
    }
  };

  // Handle touch end
  const handleTouchEnd = (e) => {
    if (touchStartX === null || !isHorizontalSwipe) {
      resetSwipe();
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const diffX = touchStartX - endX;

    // Threshold for a swipe (adjust as needed)
    const threshold = 80;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0 && hasNext) {
        // Swiped left, go to next
        handleNext();
      } else if (diffX < 0 && hasPrevious) {
        // Swiped right, go to previous
        handlePrevious();
      }
    }

    resetSwipe();
  };

  // Reset swipe state
  const resetSwipe = () => {
    setTouchStartX(null);
    setTouchStartY(null);
    setIsHorizontalSwipe(null);
    setSwipeOffset(0);
  };

  return (
    <div
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="swipeable-container"
    >
      {hasPrevious && (
        <div className={styles.leftIndicator}>
          <ChevronLeft size={24} />
        </div>
      )}

      <div
        className={styles.content}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: touchStartX !== null ? "none" : "transform 0.3s ease",
        }}
      >
        {children}
      </div>

      {hasNext && (
        <div className={styles.rightIndicator}>
          <ChevronRight size={24} />
        </div>
      )}
    </div>
  );
};

export default SwipeableContainer;
