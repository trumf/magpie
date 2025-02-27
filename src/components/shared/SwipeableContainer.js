// components/shared/SwipeableContainer.js
/*
SwipeableContainer - Touch interaction wrapper that:

Enables swipe gestures for navigating between articles
Provides keyboard navigation with arrow keys
Can display optional visual indicators for navigation directions
*/

import React, {useState, useEffect, useCallback} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import styles from "./SwipeableContainer.module.css";

const SwipeableContainer = ({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft,
  canSwipeRight,
  children,
  showIndicators = false, // Optional prop to show swipe indicators
}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canSwipeLeft) {
      onSwipeLeft();
    } else if (isRightSwipe && canSwipeRight) {
      onSwipeRight();
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft" && canSwipeRight) {
        onSwipeRight();
      } else if (e.key === "ArrowRight" && canSwipeLeft) {
        onSwipeLeft();
      }
    },
    [onSwipeLeft, onSwipeRight, canSwipeLeft, canSwipeRight]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      className={styles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {showIndicators && canSwipeRight && (
        <div className={styles.leftIndicator}>
          <ChevronLeft size={24} />
        </div>
      )}

      {children}

      {showIndicators && canSwipeLeft && (
        <div className={styles.rightIndicator}>
          <ChevronRight size={24} />
        </div>
      )}
    </div>
  );
};

export default SwipeableContainer;
