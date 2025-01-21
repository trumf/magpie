import React, {useState, useEffect, useCallback} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import "../styles/swipable.css";

const SwipeableArticle = ({
  children,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Minimum swipe distance required (in pixels)
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

    if (isLeftSwipe && hasNext) {
      onNext();
    } else if (isRightSwipe && hasPrevious) {
      onPrevious();
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft" && hasPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext();
      }
    },
    [onNext, onPrevious, hasNext, hasPrevious]
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
        {hasPrevious && (
          <button
            onClick={onPrevious}
            className="swipeable__button"
            aria-label="Previous article"
          >
            <ChevronLeft className="swipeable__icon" />
          </button>
        )}
      </div>

      <div className="swipeable__nav swipeable__nav--right">
        {hasNext && (
          <button
            onClick={onNext}
            className="swipeable__button"
            aria-label="Next article"
          >
            <ChevronRight className="swipeable__icon" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SwipeableArticle;
