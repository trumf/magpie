// components/reader/Content.js
import React, {useEffect} from "react";
import {useApp} from "../../contexts/AppContext";
import MarkdownRenderer from "../shared/MarkdownRenderer";

const Content = () => {
  const {currentFile, directoryHandle} = useApp();

  // Single source of truth for scroll reset
  useEffect(() => {
    if (currentFile) {
      // Use a slight delay to ensure content is rendered
      setTimeout(() => {
        // Reset scroll on all possible scrollable containers
        const scrollableElements = [
          document.querySelector(".reader__content"),
          document.querySelector(".content"),
          document.querySelector(".markdown"),
        ];

        scrollableElements.forEach((element) => {
          if (element) {
            element.scrollTop = 0;
          }
        });

        // Also try scrolling the window itself
        window.scrollTo(0, 0);
      }, 100);
    }
  }, [currentFile]); // This will run whenever currentFile changes

  if (!currentFile?.content) {
    return <div className="content__error">Unable to load file content</div>;
  }

  return (
    <div className="content">
      <MarkdownRenderer
        content={currentFile.content}
        directoryHandle={directoryHandle}
        filePath={currentFile.path}
      />
    </div>
  );
};

export default React.memo(Content);
