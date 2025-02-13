// components/shared/SwipeableContainer.js
import React, {useState, useEffect, useCallback} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import "../../styles/swipeable.css";

const NavigationButton = ({direction, onClick, children}) => (
  <button
    onClick={onClick}
    className="swipeable__button"
    aria-label={`${direction} article`}
  >
    {children}
  </button>
);

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
      className="swipeable"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}

      <div className="swipeable__nav swipeable__nav--left">
        {canSwipeRight && (
          <NavigationButton direction="previous" onClick={onSwipeRight}>
            <ChevronLeft className="swipeable__icon" />
          </NavigationButton>
        )}
      </div>

      <div className="swipeable__nav swipeable__nav--right">
        {canSwipeLeft && (
          <NavigationButton direction="next" onClick={onSwipeLeft}>
            <ChevronRight className="swipeable__icon" />
          </NavigationButton>
        )}
      </div>
    </div>
  );
};

export default SwipeableContainer;
