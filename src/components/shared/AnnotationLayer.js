// components/shared/AnnotationLayer.js
import React from "react";
import {X} from "lucide-react";
import {useApp} from "../../contexts/AppContext";
import "../../styles/annotation-layer.css";

const AnnotationLayer = () => {
  const {
    isAnnotating,
    annotationText,
    setAnnotationText,
    saveAnnotation,
    cancelAnnotation,
    selectedParagraphs,
  } = useApp();

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
    <>
      <div className="annotation-overlay" onClick={handleCancel} />
      <div className="annotation-panel">
        <div className="annotation-panel__header">
          <h3 className="annotation-panel__title">
            Add Annotation
            <span className="annotation-panel__subtitle">
              {selectedParagraphs.size}{" "}
              {selectedParagraphs.size === 1 ? "paragraph" : "paragraphs"}{" "}
              selected
            </span>
          </h3>
          <button
            className="annotation-panel__close"
            onClick={handleCancel}
            aria-label="Close annotation panel"
          >
            <X size={24} />
          </button>
        </div>

        <div className="annotation-panel__content">
          <textarea
            className="annotation-panel__textarea"
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add your notes here..."
            rows={8}
            autoFocus
          />
        </div>

        <div className="annotation-panel__footer">
          <button
            onClick={handleCancel}
            className="annotation-panel__button annotation-panel__button--secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="annotation-panel__button annotation-panel__button--primary"
          >
            Save Annotation
          </button>
        </div>
      </div>
    </>
  );
};

export default AnnotationLayer;
