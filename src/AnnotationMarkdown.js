import React, {useState, useEffect} from "react";
import {getAnnotationService} from "./services/AnnotationService";

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
    if (!content) return;

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
      setSelectedParagraphs(new Set([index]));
      setIsAnnotating(true);
    } else {
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
        await annotationService.trackParagraph(
          articleId,
          paragraphText,
          paragraphIndex
        );

        if (annotationText.trim()) {
          await annotationService.addAnnotation({
            articleId,
            paragraphIndex,
            text: annotationText,
            type: "note",
          });
        }
      }

      await loadAnnotations();
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
    <div className="markdown">
      {paragraphs.map((paragraph, index) => (
        <div
          key={index}
          onClick={() => handleParagraphClick(index)}
          className={`markdown__paragraph markdown__paragraph--interactive ${
            selectedParagraphs.has(index) ? "markdown__paragraph--selected" : ""
          }`}
        >
          {annotations[index] && (
            <span className="markdown__annotation-marker" />
          )}
          {paragraph}
        </div>
      ))}

      {isAnnotating && (
        <div className="annotation-panel">
          <h3 className="annotation-panel__title">Add Annotation</h3>
          <textarea
            className="annotation-panel__textarea"
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            placeholder="Add your notes here (optional)"
            rows={4}
          />
          <div className="annotation-panel__buttons">
            <button
              onClick={saveAnnotation}
              className="annotation-panel__button annotation-panel__button--save"
            >
              Save
            </button>
            <button
              onClick={cancelAnnotation}
              className="annotation-panel__button annotation-panel__button--cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotatedMarkdown;
