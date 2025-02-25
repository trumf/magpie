// components/reader/ArticleNavigation.js
import React from "react";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import {ChevronLeft, ChevronRight} from "lucide-react";
import "../../styles/article-navigation.css";

const ArticleNavigation = () => {
  const {hasNext, hasPrevious, navigateNext, navigatePrevious} =
    useFileNavigation();

  // Helper function to reset scroll
  const resetScroll = () => {
    setTimeout(() => {
      const scrollableElements = [
        document.querySelector(".reader__content"),
        document.querySelector(".content"),
        document.querySelector(".markdown"),
      ];

      scrollableElements.forEach((element) => {
        if (element) {
          console.log(
            "Navigation buttons: Resetting scroll for",
            element.className
          );
          element.scrollTop = 0;
        }
      });
    }, 150);
  };

  // Wrapped navigation handlers
  const handleNext = () => {
    navigateNext();
    resetScroll();
  };

  const handlePrevious = () => {
    navigatePrevious();
    resetScroll();
  };

  if (!hasNext && !hasPrevious) {
    return null;
  }

  return (
    <div className="article-navigation">
      <button
        className="article-navigation__button article-navigation__button--previous"
        disabled={!hasPrevious}
        onClick={handlePrevious}
        aria-label="Previous article"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        className="article-navigation__button article-navigation__button--next"
        disabled={!hasNext}
        onClick={handleNext}
        aria-label="Next article"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
};

export default ArticleNavigation;
