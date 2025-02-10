// components/shared/MarkdownRenderer.js
import React from "react";
import ReactMarkdown from "react-markdown";
import ImageRenderer from "./ImageRenderer";

const MarkdownRenderer = ({content, directoryHandle, filePath}) => {
  const components = {
    img: ({node, ...props}) => (
      <ImageRenderer
        {...props}
        directoryHandle={directoryHandle}
        filePath={filePath}
      />
    ),
  };

  return (
    <div className="markdown">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
