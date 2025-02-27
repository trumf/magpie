// components/reader/ArticleNavigation.jsx
import React from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import styles from "./ArticleNavigation.module.css";

const ArticleNavigation = () => {
  const {hasNext, hasPrevious, navigateNext, navigatePrevious} =
    useFileNavigation();

  if (!hasNext && !hasPrevious) {
    return null; // Don't render anything if there's nowhere to navigate
  }

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        {hasPrevious && (
          <button
            onClick={navigatePrevious}
            className={styles.previousButton}
            aria-label="Previous article"
          >
            <ChevronLeft size={24} />
            <span className={styles.buttonText}>Previous</span>
          </button>
        )}

        {hasNext && (
          <button
            onClick={navigateNext}
            className={styles.nextButton}
            aria-label="Next article"
          >
            <span className={styles.buttonText}>Next</span>
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ArticleNavigation;
