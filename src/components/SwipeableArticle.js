import React, {useState, useEffect, useCallback} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";

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
      className="relative w-full h-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}

      <div className="fixed top-1/2 left-4 -translate-y-1/2">
        {hasPrevious && (
          <button
            onClick={onPrevious}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous article"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="fixed top-1/2 right-4 -translate-y-1/2">
        {hasNext && (
          <button
            onClick={onNext}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            aria-label="Next article"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SwipeableArticle;
