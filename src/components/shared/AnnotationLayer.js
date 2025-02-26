// components/shared/AnnotationLayer.jsx
import React from "react";
import {useApp} from "../../contexts/AppContext";
import styles from "./AnnotationLayer.module.css";

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
    <div className={styles.panel}>
      <h3 className={styles.title}>Add Annotation</h3>
      <textarea
        className={styles.textarea}
        value={annotationText}
        onChange={(e) => setAnnotationText(e.target.value)}
        placeholder="Add your notes here (optional)"
        rows={4}
        autoFocus
      />
      <div className={styles.buttons}>
        <button onClick={handleSave} className={styles.saveButton}>
          Save
        </button>
        <button onClick={handleCancel} className={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AnnotationLayer;
