// components/shared/MarkdownRenderer.js
import React, {useMemo} from "react";
import ReactMarkdown from "react-markdown";
import ImageRenderer from "./ImageRenderer";
import {useApp} from "../../contexts/AppContext";

const MarkdownRenderer = ({content, directoryHandle, filePath}) => {
  const {selectedParagraphs, handleParagraphClick, annotations} = useApp();

  // Split content into paragraphs once
  const paragraphs = useMemo(() => {
    return content.split("\n\n").filter((p) => p.trim());
  }, [content]);

  const components = {
    img: ({node, ...props}) => (
      <ImageRenderer
        {...props}
        directoryHandle={directoryHandle}
        filePath={filePath}
      />
    ),
  };

  const onParagraphClick = (index) => {
    console.log("Paragraph clicked in renderer:", index);
    handleParagraphClick(index);
  };

  return (
    <div className="markdown">
      {paragraphs.map((paragraph, index) => {
        const isSelected = selectedParagraphs.has(index);
        const hasAnnotations = annotations[index]?.length > 0;

        return (
          <div
            key={index}
            onClick={() => onParagraphClick(index)}
            className={`markdown__paragraph markdown__paragraph--interactive ${
              isSelected ? "markdown__paragraph--selected" : ""
            }`}
          >
            {hasAnnotations && <span className="markdown__annotation-marker" />}
            <ReactMarkdown components={components}>{paragraph}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(MarkdownRenderer);
