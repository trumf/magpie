// components/shared/AnnotationLayer.js
import React from "react";
import {useApp} from "../../contexts/AppContext";

const AnnotationLayer = () => {
  const {
    isAnnotating,
    annotationText,
    setAnnotationText,
    saveAnnotation,
    cancelAnnotation,
  } = useApp();

  console.log("AnnotationLayer render:", {isAnnotating});

  if (!isAnnotating) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    await saveAnnotation();
  };

  const handleCancel = (e) => {
    e.preventDefault();
    cancelAnnotation();
  };

  return (
    <div className="annotation-panel">
      <h3 className="annotation-panel__title">Add Annotation</h3>
      <textarea
        className="annotation-panel__textarea"
        value={annotationText}
        onChange={(e) => setAnnotationText(e.target.value)}
        placeholder="Add your notes here (optional)"
        rows={4}
        autoFocus
      />
      <div className="annotation-panel__buttons">
        <button
          onClick={handleSave}
          className="annotation-panel__button annotation-panel__button--save"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="annotation-panel__button annotation-panel__button--cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AnnotationLayer;
