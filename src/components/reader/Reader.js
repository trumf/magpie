// components/reader/Reader.js
import React from "react";
import {useApp} from "../../contexts/AppContext";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import Navigation from "./Navigation";
import Content from "./Content";
import Import from "./Import";
import AnnotationLayer from "../shared/AnnotationLayer";
import SwipeableContainer from "../shared/SwipeableContainer";

const Reader = () => {
  const {isImporting, currentFile, isSidebarVisible} = useApp();
  const {hasNext, hasPrevious, navigateNext, navigatePrevious} =
    useFileNavigation();

  if (isImporting) {
    return <Import />;
  }

  return (
    <div className="reader">
      <Navigation />
      <main
        className={`reader__content ${
          isSidebarVisible ? "reader__content--shifted" : ""
        }`}
      >
        {currentFile ? (
          <SwipeableContainer
            onSwipeLeft={navigateNext}
            onSwipeRight={navigatePrevious}
            canSwipeLeft={hasNext}
            canSwipeRight={hasPrevious}
          >
            <Content />
          </SwipeableContainer>
        ) : (
          <div className="reader__empty">Select a file</div>
        )}
      </main>
      <AnnotationLayer />
    </div>
  );
};

export default Reader;
