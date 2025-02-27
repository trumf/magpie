// components/shared/MarkdownRenderer.js
/*
MarkdownRenderer - The core rendering component that:

Splits markdown content into paragraphs
Handles paragraph selection for annotations
Applies styling to paragraphs based on their state (selected, annotated)
Delegates image rendering to the ImageRenderer
*/
import React, {useMemo} from "react";
import ReactMarkdown from "react-markdown";
import ImageRenderer from "./ImageRenderer";
import {useApp} from "../../contexts/AppContext";
import styles from "./MarkdownRenderer.module.css";

const MarkdownRenderer = ({content, directoryHandle, filePath}) => {
  const {selectedParagraphs, handleParagraphClick, annotations} = useApp();

  // Split content into paragraphs once, with content validation
  const paragraphs = useMemo(() => {
    if (!content) return [];
    return content.split("\n\n").filter((p) => p.trim());
  }, [content]);

  // Custom components for ReactMarkdown
  const components = useMemo(
    () => ({
      img: ({node, ...props}) => (
        <ImageRenderer
          {...props}
          directoryHandle={directoryHandle}
          filePath={filePath}
        />
      ),
    }),
    [directoryHandle, filePath]
  );

  // Handle paragraph click with logging
  const onParagraphClick = (index) => {
    console.log("Paragraph clicked in renderer:", index);
    handleParagraphClick(index);
  };

  // If no content, show a message
  if (!content) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No content available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {paragraphs.map((paragraph, index) => {
        const isSelected = selectedParagraphs.has(index);
        const hasAnnotations = annotations[index]?.length > 0;

        return (
          <div
            key={index}
            onClick={() => onParagraphClick(index)}
            className={`${styles.paragraph} ${styles.interactive} ${
              isSelected ? styles.selected : ""
            }`}
          >
            {hasAnnotations && <span className={styles.annotationMarker} />}
            <ReactMarkdown components={components}>{paragraph}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(MarkdownRenderer);
