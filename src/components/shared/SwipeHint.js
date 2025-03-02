// components/shared/SwipeHint.js
import React, {useState, useEffect} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import styles from "./SwipeHint.module.css";

const SwipeHint = ({
  firstVisit = false, // Show on first visit
  canSwipeLeft = false,
  canSwipeRight = false,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const localStorageKey = "swipe_hint_shown";

  useEffect(() => {
    // Check if this is first visit and hint hasn't been shown
    if (firstVisit && !localStorage.getItem(localStorageKey)) {
      const timer = setTimeout(() => {
        setVisible(true);
        // Start animation after a short delay
        setTimeout(() => setAnimating(true), 500);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [firstVisit]);

  const handleDismiss = () => {
    setVisible(false);
    setAnimating(false);
    localStorage.setItem(localStorageKey, "true");

    if (onDismiss) {
      onDismiss();
    }
  };

  if (!visible) return null;

  return (
    <div className={styles.hintContainer}>
      <div className={styles.overlay} onClick={handleDismiss}>
        <div className={styles.hintCard} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.title}>Swipe Navigation</h3>

          <div className={styles.demonstration}>
            {canSwipeRight && (
              <div
                className={`${styles.arrow} ${styles.leftArrow} ${
                  animating ? styles.animateLeft : ""
                }`}
              >
                <ChevronLeft size={24} />
                <span>Previous Article</span>
              </div>
            )}

            <div className={styles.phoneFrame}>
              <div className={styles.content}>
                <div className={styles.fakeParagraph}></div>
                <div className={styles.fakeParagraph}></div>
                <div className={styles.fakeParagraph}></div>
              </div>
            </div>

            {canSwipeLeft && (
              <div
                className={`${styles.arrow} ${styles.rightArrow} ${
                  animating ? styles.animateRight : ""
                }`}
              >
                <span>Next Article</span>
                <ChevronRight size={24} />
              </div>
            )}
          </div>

          <p className={styles.description}>
            Swipe left or right to navigate between articles. A gentle swipe
            will let you peek at the next article. Release to cancel or swipe
            further to navigate.
          </p>

          <button className={styles.button} onClick={handleDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwipeHint;
