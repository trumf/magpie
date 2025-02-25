// components/shared/SwipeableContainer.js
import React, {useState, useEffect, useCallback} from "react";
import "../../styles/swipeable.css";

const SwipeableContainer = ({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft,
  canSwipeRight,
  children,
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

  // Modified swipe handlers with scroll reset
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canSwipeLeft) {
      onSwipeLeft();
      resetScroll();
    } else if (isRightSwipe && canSwipeRight) {
      onSwipeRight();
      resetScroll();
    }
  };

  // Reset scroll function
  const resetScroll = () => {
    setTimeout(() => {
      const scrollableElements = [
        document.querySelector(".reader__content"),
        document.querySelector(".content"),
        document.querySelector(".markdown"),
      ];

      scrollableElements.forEach((element) => {
        if (element) {
          console.log(
            "Swipe navigation: Resetting scroll for",
            element.className
          );
          element.scrollTop = 0;
        }
      });

      window.scrollTo(0, 0);
    }, 150);
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft" && canSwipeRight) {
        onSwipeRight();
        resetScroll();
      } else if (e.key === "ArrowRight" && canSwipeLeft) {
        onSwipeLeft();
        resetScroll();
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
      className="swipeable"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  );
};

export default SwipeableContainer;
