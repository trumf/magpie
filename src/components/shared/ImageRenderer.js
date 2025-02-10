// components/shared/ImageRenderer.js
import React, {useState, useEffect} from "react";
import "../../styles/markdown.css";

const decodePath = (path) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const ImageRenderer = ({src, alt, directoryHandle, filePath}) => {
  const [imageSrc, setImageSrc] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadImage = async () => {
      console.log("Loading image:", {
        src,
        filePath,
        hasDirectoryHandle: !!directoryHandle,
      });

      try {
        if (!src) return;

        if (src.startsWith("blob:")) {
          setImageSrc(src);
          return;
        }

        if (directoryHandle) {
          const markdownPathParts = decodePath(filePath).split("/");
          const markdownDir = markdownPathParts.slice(0, -1).join("/");
          const decodedSrc = decodePath(src);
          const pathParts = decodedSrc.split("/").filter(Boolean);

          console.log("Image path details:", {
            markdownDir,
            decodedSrc,
            pathParts,
          });

          let currentHandle = directoryHandle;

          // Navigate to markdown directory
          for (const part of markdownDir.split("/").filter(Boolean)) {
            console.log("Navigating to directory:", part);
            currentHandle = await currentHandle.getDirectoryHandle(part);
          }

          // Navigate to image
          for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (i === pathParts.length - 1) {
              console.log("Getting file:", part);
              currentHandle = await currentHandle.getFileHandle(part);
            } else {
              console.log("Navigating to subdirectory:", part);
              currentHandle = await currentHandle.getDirectoryHandle(part);
            }
          }

          if (currentHandle.kind === "file") {
            const file = await currentHandle.getFile();
            const blob = new Blob([await file.arrayBuffer()], {
              type: file.type || "image/png",
            });
            const url = URL.createObjectURL(blob);
            console.log("Successfully created image URL:", url);
            setImageSrc(url);
            setError(null);
          }
        } else {
          console.log("No directory handle available");
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setError(`Failed to load image: ${src}`);
        setImageSrc("");
      }
    };

    loadImage();

    return () => {
      if (imageSrc && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, directoryHandle, filePath]);

  if (error) {
    return <div className="markdown__image-error">{error}</div>;
  }

  return (
    <div className="markdown__image-container">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className="markdown__image"
          loading="lazy"
        />
      ) : (
        <div className="markdown__image-loading">Loading image... {src}</div>
      )}
    </div>
  );
};

export default ImageRenderer;
