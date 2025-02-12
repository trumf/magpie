// components/reader/Content.js
import React from "react";
import {useApp} from "../../contexts/AppContext";
import MarkdownRenderer from "../shared/MarkdownRenderer";

const Content = () => {
  const {currentFile, directoryHandle} = useApp();

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
