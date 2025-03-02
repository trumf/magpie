// components/shared/SwipeableContainer.js
import React, {useState, useRef} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import styles from "./SwipeableContainer.module.css";

const SwipeableContainer = ({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft,
  canSwipeRight,
  children,
}) => {
  // Refs
  const startXRef = useRef(null);
  const containerRef = useRef(null);

  // Visual feedback state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Touch handlers
  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!startXRef.current) return;

    const currentX = e.touches[0].clientX;
    const delta = currentX - startXRef.current;

    // Limit drag direction based on availability
    if ((delta < 0 && canSwipeLeft) || (delta > 0 && canSwipeRight)) {
      // Apply some resistance
      setDragOffset(delta * 0.5);
    }
  };

  const handleTouchEnd = () => {
    if (!startXRef.current || !containerRef.current) {
      resetDrag();
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.3; // 30% threshold

    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset < 0 && canSwipeLeft) {
        console.log("EXECUTING LEFT SWIPE");
        onSwipeLeft && onSwipeLeft();
      } else if (dragOffset > 0 && canSwipeRight) {
        console.log("EXECUTING RIGHT SWIPE");
        onSwipeRight && onSwipeRight();
      }
    }

    resetDrag();
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    startXRef.current = e.clientX;
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection
  };

  const handleMouseMove = (e) => {
    if (!startXRef.current || !isDragging) return;

    const delta = e.clientX - startXRef.current;

    // Limit drag direction based on availability
    if ((delta < 0 && canSwipeLeft) || (delta > 0 && canSwipeRight)) {
      // Apply some resistance
      setDragOffset(delta * 0.5);
    }
  };

  const handleMouseUp = () => {
    if (!startXRef.current || !containerRef.current) {
      resetDrag();
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const threshold = containerWidth * 0.3; // 30% threshold

    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset < 0 && canSwipeLeft) {
        console.log("EXECUTING LEFT SWIPE");
        onSwipeLeft && onSwipeLeft();
      } else if (dragOffset > 0 && canSwipeRight) {
        console.log("EXECUTING RIGHT SWIPE");
        onSwipeRight && onSwipeRight();
      }
    }

    resetDrag();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      resetDrag();
    }
  };

  const resetDrag = () => {
    startXRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  // Calculate indicator opacity based on drag progress
  const progress = Math.min(
    1,
    Math.abs(dragOffset) / (containerRef.current?.offsetWidth * 0.3 || 1)
  );
  const leftOpacity = dragOffset > 0 ? progress * 0.8 : 0;
  const rightOpacity = dragOffset < 0 ? progress * 0.8 : 0;

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {canSwipeRight && (
        <div className={styles.leftIndicator} style={{opacity: leftOpacity}}>
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
        <div className={styles.rightIndicator} style={{opacity: rightOpacity}}>
          <ChevronRight size={24} />
        </div>
      )}
    </div>
  );
};

export default SwipeableContainer;
