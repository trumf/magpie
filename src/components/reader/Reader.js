// components/reader/Reader.js

/*
Reader - The top-level container component that:

Orchestrates the overall layout (sidebar, content area)
Manages navigation between importing and reading states
Houses all the other article-related components
*/

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
  const {hasNext, hasPrevious, navigateNext, navigatePrevious} =
    useFileNavigation();

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
              onSwipeLeft={navigateNext}
              onSwipeRight={navigatePrevious}
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
