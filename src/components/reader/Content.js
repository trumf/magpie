// components/reader/Content.js
import React from "react";
import {useApp} from "../../contexts/AppContext";
import MarkdownRenderer from "../shared/MarkdownRenderer";
import AnnotationLayer from "../shared/AnnotationLayer";

const Content = () => {
  const {currentFile, directoryHandle} = useApp();

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

export default Content;
