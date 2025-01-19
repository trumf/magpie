import React, {useState, useEffect} from "react";
import ReactMarkdown from "react-markdown";
import {getAnnotationService} from "./services/AnnotationService";
import "./styles/markdown.css";
import "./styles/reader.css";

// Helper function to decode paths
const decodePath = (path) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

// Custom renderer for images that handles relative paths
const ImageRenderer = ({src, alt, directoryHandle, filePath}) => {
  const [imageSrc, setImageSrc] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        // Get the directory name from the markdown file path
        const markdownPathParts = decodePath(filePath).split("/");
        const markdownDir = markdownPathParts.slice(0, -1).join("/");

        // Get the image path, handling both encoded and unencoded paths
        const decodedSrc = decodePath(src);

        // Split the path and filter out empty parts
        const pathParts = decodedSrc.split("/").filter(Boolean);

        // Start from the root directory handle
        let currentHandle = directoryHandle;

        // First navigate to the markdown file's directory
        for (const part of markdownDir.split("/").filter(Boolean)) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }

        // Then navigate to the image
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          if (i === pathParts.length - 1) {
            // Last part is the file
            currentHandle = await currentHandle.getFileHandle(part);
          } else {
            // Navigate through directories
            currentHandle = await currentHandle.getDirectoryHandle(part);
          }
        }

        // Get the image file
        if (currentHandle.kind === "file") {
          const file = await currentHandle.getFile();
          const blob = new Blob([await file.arrayBuffer()], {
            type: file.type || "image/png",
          });
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
          setError(null);
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setError(`Failed to load image: ${src}`);
        setImageSrc("");
      }
    };

    if (src && directoryHandle) {
      loadImage();
    }

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, directoryHandle, filePath]);

  if (error) {
    return <div className="markdown__image-error">{error}</div>;
  }

  return imageSrc ? (
    <img src={imageSrc} alt={alt} className="markdown__image" />
  ) : (
    <div className="markdown__image-loading">Loading image...</div>
  );
};

const AnnotatedMarkdown = ({content, articleId, directoryHandle}) => {
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

  // Custom components configuration for ReactMarkdown
  const components = {
    img: ({node, ...props}) => (
      <ImageRenderer
        {...props}
        directoryHandle={directoryHandle}
        filePath={articleId} // Using articleId as filePath since it contains the full path
      />
    ),
  };

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
          <ReactMarkdown components={components}>{paragraph}</ReactMarkdown>
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
