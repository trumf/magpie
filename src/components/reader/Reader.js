// components/reader/Reader.js

/*
Reader - The top-level container component that:

Orchestrates the overall layout (sidebar, content area)
Always renders the Header regardless of state
Conditionally renders Import or Content
*/
// components/reader/Reader.js - simplified version
import React from "react";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import Header from "./Header";
import Navigation from "./Navigation";
import Content from "./Content";
import Import from "./Import";
import AnnotationLayer from "../shared/AnnotationLayer";
import SwipeableContainer from "../shared/SwipeableContainer";
import ArticleNavigation from "./ArticleNavigation";
import styles from "./Reader.module.css";

const Reader = () => {
  const {isImporting, currentFile, isSidebarVisible} = useApp();
  const {
    hasNext,
    hasPrevious,
    navigateNext: origNavigateNext,
    navigatePrevious: origNavigatePrevious,
  } = useFileNavigation();

  // Direct handlers, no useCallback to eliminate one possible issue source
  const handleSwipeLeft = () => {
    console.log("READER: Swipe left handler called, hasNext =", hasNext);
    if (hasNext) {
      console.log("READER: Executing navigateNext");
      origNavigateNext();
      return true;
    }
    return false;
  };

  const handleSwipeRight = () => {
    console.log(
      "READER: Swipe right handler called, hasPrevious =",
      hasPrevious
    );
    if (hasPrevious) {
      console.log("READER: Executing navigatePrevious");
      origNavigatePrevious();
      return true;
    }
    return false;
  };

  if (isImporting) {
    return <Import />;
  }

  return (
    <div className={styles.container}>
      <Header />
      <Navigation />
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
            >
              <Content />
            </SwipeableContainer>
            <ArticleNavigation />
          </>
        ) : (
          <div className={styles.empty}>
            Select a file from the navigation menu to start reading
          </div>
        )}
      </main>
      <AnnotationLayer />
    </div>
  );
};

export default Reader;
