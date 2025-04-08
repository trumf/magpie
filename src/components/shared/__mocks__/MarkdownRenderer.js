// Mock implementation of MarkdownRenderer
import React from "react";

const MarkdownRenderer = ({content, onElementClick}) => {
  return (
    <div data-testid="mock-markdown-renderer">
      <div data-testid="mock-markdown-content">{content}</div>
      <button
        data-testid="mock-element-click"
        onClick={() => onElementClick && onElementClick(0)}
      >
        Mock Element
      </button>
    </div>
  );
};

export default MarkdownRenderer;
