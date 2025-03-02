// components/reader/Reader.js

/*
Reader - The top-level container component that:

Orchestrates the overall layout (sidebar, content area)
Always renders the Header regardless of state
Conditionally renders Import or Content
*/
// components/reader/Reader.js
import React, {useState, useEffect, useCallback} from "react";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import Header from "./Header";
import Navigation from "./Navigation";
import Content from "./Content";
import Import from "./Import";
import AnnotationLayer from "../shared/AnnotationLayer";
import SwipeableContainer from "../shared/SwipeableContainer";
import SwipeHint from "../shared/SwipeHint";
import ArticleNavigation from "./ArticleNavigation";
import styles from "./Reader.module.css";

const Reader = () => {
  const {isImporting, currentFile, isSidebarVisible} = useApp();
  const {hasNext, hasPrevious, navigateNext, navigatePrevious} =
    useFileNavigation();

  // Create stable callback functions
  const handleSwipeLeft = useCallback(() => {
    console.log("Reader: Handling swipe left, hasNext:", hasNext);
    if (hasNext) {
      navigateNext();
    }
  }, [hasNext, navigateNext]);

  const handleSwipeRight = useCallback(() => {
    console.log("Reader: Handling swipe right, hasPrevious:", hasPrevious);
    if (hasPrevious) {
      navigatePrevious();
    }
  }, [hasPrevious, navigatePrevious]);

  // State to track if this is user's first visit with files
  const [isFirstFileView, setIsFirstFileView] = useState(false);

  // Check if this is the first time viewing a file
  useEffect(() => {
    if (currentFile && !localStorage.getItem("first_file_viewed")) {
      setIsFirstFileView(true);
      localStorage.setItem("first_file_viewed", "true");
    }
  }, [currentFile]);

  // Handle dismissal of swipe hint
  const handleSwipeHintDismiss = () => {
    setIsFirstFileView(false);
  };

  return (
    <div className={styles.container}>
      <Header />
      <Navigation />

      {isImporting ? (
        <Import />
      ) : (
        <main
          className={`${styles.content} ${
            isSidebarVisible ? styles.contentShifted : ""
          }`}
        >
          {currentFile ? (
            <>
              <SwipeableContainer
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                canSwipeLeft={hasNext}
                canSwipeRight={hasPrevious}
                swipeThreshold={0.3}
                showIndicators={true}
              >
                <Content />
              </SwipeableContainer>
              <ArticleNavigation />

              <SwipeHint
                firstVisit={isFirstFileView}
                canSwipeLeft={hasNext}
                canSwipeRight={hasPrevious}
                onDismiss={handleSwipeHintDismiss}
              />
            </>
          ) : (
            <div className={styles.empty}>
              Select a file from the navigation menu to start reading
            </div>
          )}
        </main>
      )}
      <AnnotationLayer />
    </div>
  );
};

export default Reader;
