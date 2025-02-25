// components/reader/Content.js
import React, {useEffect, useState} from "react";
import {useApp} from "../../contexts/AppContext";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import "../../styles/content.css";
import "../../styles/transitions.css"; // Import the new styles

const Content = () => {
  const {currentFile, directoryHandle} = useApp();
  const [transitionState, setTransitionState] = useState("visible");
  const [displayedFile, setDisplayedFile] = useState(currentFile);

  // Handle file changes with animation
  useEffect(() => {
    if (
      currentFile &&
      (!displayedFile || currentFile.path !== displayedFile.path)
    ) {
      // Start exit animation
      setTransitionState("exiting");

      // After exit animation completes, update content and start enter animation
      setTimeout(() => {
        // Reset scroll
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

        window.scrollTo(0, 0);

        // Update displayed content
        setDisplayedFile(currentFile);
        setTransitionState("entering");

        // After a short delay, complete the enter animation
        setTimeout(() => {
          setTransitionState("visible");
        }, 50);
      }, 300); // Match this to the CSS transition duration
    } else if (!currentFile) {
      setDisplayedFile(null);
    }
  }, [currentFile]);

  if (!displayedFile) {
    return null;
  }

  return (
    <div className={`content content--${transitionState}`}>
      <MarkdownRenderer
        content={displayedFile.content}
        directoryHandle={directoryHandle}
        filePath={displayedFile.path}
      />
    </div>
  );
};

export default Content;
