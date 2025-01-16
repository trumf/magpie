import React, {useState, useEffect} from "react";
import {getAnnotationService} from "./services/AnnotationService";

const styles = {
  container: {
    position: "relative",
  },
  paragraph: {
    cursor: "pointer",
    padding: "0.5rem",
    margin: "0.5rem 0",
    borderRadius: "4px",
    transition: "background-color 0.2s",
  },
  selectedParagraph: {
    backgroundColor: "#f0f0f0",
    border: "1px solid #e0e0e0",
  },
  annotationPanel: {
    position: "fixed",
    right: "20px",
    top: "20px",
    width: "300px",
    backgroundColor: "white",
    padding: "1rem",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    zIndex: 1000,
  },
  annotationInput: {
    width: "100%",
    padding: "0.5rem",
    marginBottom: "1rem",
    borderRadius: "4px",
    border: "1px solid #e0e0e0",
  },
  button: {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    marginRight: "0.5rem",
    cursor: "pointer",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    color: "white",
  },
  cancelButton: {
    backgroundColor: "#f44336",
    color: "white",
  },
  annotationMarker: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#FFC107",
    display: "inline-block",
    marginRight: "8px",
  },
};

const AnnotatedMarkdown = ({content, articleId}) => {
  const [paragraphs, setParagraphs] = useState([]);
  const [selectedParagraphs, setSelectedParagraphs] = useState(new Set());
  const [annotationText, setAnnotationText] = useState("");
  const [annotations, setAnnotations] = useState({});
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationService, setAnnotationService] = useState(null);

  // Initialize annotation service
  useEffect(() => {
    const initService = async () => {
      const service = await getAnnotationService();
      setAnnotationService(service);
    };
    initService();
  }, []);

  useEffect(() => {
    // Split content into paragraphs and initialize
    const splitParagraphs = content.split("\n\n").filter((p) => p.trim());
    setParagraphs(splitParagraphs);
    if (annotationService) {
      loadAnnotations();
    }
  }, [content, articleId, annotationService]);

  const loadAnnotations = async () => {
    if (!annotationService) return;
    try {
      const articleAnnotations =
        await annotationService.getAnnotationsForArticle(articleId);
      const annotationMap = {};
      articleAnnotations.forEach((annotation) => {
        if (!annotationMap[annotation.paragraphIndex]) {
          annotationMap[annotation.paragraphIndex] = [];
        }
        annotationMap[annotation.paragraphIndex].push(annotation);
      });
      setAnnotations(annotationMap);
    } catch (error) {
      console.error("Failed to load annotations:", error);
    }
  };

  const handleParagraphClick = (index) => {
    if (!isAnnotating) {
      // Start annotation mode with the clicked paragraph
      setSelectedParagraphs(new Set([index]));
      setIsAnnotating(true);
    } else {
      // Toggle paragraph selection in annotation mode
      const newSelected = new Set(selectedParagraphs);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedParagraphs(newSelected);
    }
  };

  const saveAnnotation = async () => {
    if (!annotationService) return;
    try {
      for (const paragraphIndex of selectedParagraphs) {
        const paragraphText = paragraphs[paragraphIndex];

        // Track paragraph for future reference
        await annotationService.trackParagraph(
          articleId,
          paragraphText,
          paragraphIndex
        );

        // Create annotation if text is provided
        if (annotationText.trim()) {
          await annotationService.addAnnotation({
            articleId,
            paragraphIndex,
            text: annotationText,
            type: "note",
          });
        }
      }

      // Reload annotations
      await loadAnnotations();

      // Reset state
      setSelectedParagraphs(new Set());
      setAnnotationText("");
      setIsAnnotating(false);
    } catch (error) {
      console.error("Failed to save annotation:", error);
    }
  };

  const cancelAnnotation = () => {
    setSelectedParagraphs(new Set());
    setAnnotationText("");
    setIsAnnotating(false);
  };

  return (
    <div style={styles.container}>
      {paragraphs.map((paragraph, index) => (
        <div
          key={index}
          onClick={() => handleParagraphClick(index)}
          style={{
            ...styles.paragraph,
            ...(selectedParagraphs.has(index) ? styles.selectedParagraph : {}),
          }}
        >
          {annotations[index] && <span style={styles.annotationMarker} />}
          {paragraph}
        </div>
      ))}

      {isAnnotating && (
        <div style={styles.annotationPanel}>
          <h3>Add Annotation</h3>
          <textarea
            style={styles.annotationInput}
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add your notes here (optional)"
            rows={4}
          />
          <button
            onClick={saveAnnotation}
            style={{...styles.button, ...styles.saveButton}}
          >
            Save
          </button>
          <button
            onClick={cancelAnnotation}
            style={{...styles.button, ...styles.cancelButton}}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnotatedMarkdown;
