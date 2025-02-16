// components/reader/ArticleNavigation.js
import React from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useFileNavigation} from "../../hooks/useFileNavigation";
import "../../styles/article-navigation.css";

const ArticleNavigation = () => {
  const {hasNext, hasPrevious, navigateNext, navigatePrevious} =
    useFileNavigation();

  return (
    <div className="article-navigation">
      <div className="article-navigation__buttons">
        {hasPrevious && (
          <button
            onClick={navigatePrevious}
            className="article-navigation__button article-navigation__button--previous"
            aria-label="Previous article"
          >
            <ChevronLeft size={24} />
            <span>Previous</span>
          </button>
        )}

        {hasNext && (
          <button
            onClick={navigateNext}
            className="article-navigation__button article-navigation__button--next"
            aria-label="Next article"
          >
            <span>Next</span>
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ArticleNavigation;
