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

const isExternalUrl = (url) => {
  return url.startsWith("http://") || url.startsWith("https://");
};

const ImageRenderer = ({src, alt, directoryHandle, filePath}) => {
  const [imageSrc, setImageSrc] = useState("");
  const [error, setError] = useState(null);

  const getParentDir = (filePath) => {
    if (filePath.includes("/")) {
      // Return everything before the last slash
      return filePath.substring(0, filePath.lastIndexOf("/"));
    }
    // If no slash, assume the file is at the root and the directory has the same name as the file (without .md)
    return filePath.replace(/\.md$/, "");
  };

  useEffect(() => {
    let currentBlobUrl = "";

    const loadImage = async () => {
      try {
        if (!src) return;
        console.log("Loading image:", {
          src,
          filePath,
          hasDirectoryHandle: !!directoryHandle,
        });

        // Handle external URLs
        if (isExternalUrl(src)) {
          setImageSrc(src);
          return;
        }

        // Handle ZIP file images (blob URLs)
        if (src.startsWith("blob:")) {
          setImageSrc(src);
          return;
        }

        // Handle local files through directory handle
        if (directoryHandle) {
          try {
            // 1. Determine the base directory by removing the .md extension.
            const baseDir = filePath.replace(/\.md$/, "");
            console.log("Base directory for images:", baseDir);

            // 2. Navigate from the root directoryHandle using the base directory segments.
            let currentHandle = directoryHandle;
            const baseSegments = baseDir.split("/");
            for (const segment of baseSegments) {
              currentHandle = await currentHandle.getDirectoryHandle(segment);
            }

            // 3. Navigate further if the image src specifies subdirectories.
            const imageSegments = decodePath(src).split("/");
            // If there are any subdirectories in the src (all segments except the file name):
            for (let i = 0; i < imageSegments.length - 1; i++) {
              currentHandle = await currentHandle.getDirectoryHandle(
                imageSegments[i]
              );
            }

            // 4. Finally, get the image file.
            const imageFile = imageSegments[imageSegments.length - 1];
            const fileHandle = await currentHandle.getFileHandle(imageFile);
            const file = await fileHandle.getFile();
            const blob = new Blob([await file.arrayBuffer()], {
              type: file.type || "image/png",
            });
            const url = URL.createObjectURL(blob);
            console.log("Created blob URL:", url);
            setImageSrc(url);
            setError(null);
          } catch (error) {
            console.error("Error loading local image:", error, {src, filePath});
            // Fallback: try using src directly.
            setImageSrc(src);
          }
        } else {
          // If no directory handle, fall back to using the src directly.
          setImageSrc(src);
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setError(`Failed to load image: ${src}`);
        setImageSrc("");
      }
    };

    loadImage();

    // Cleanup function
    return () => {
      if (currentBlobUrl && currentBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentBlobUrl);
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
        <div className="markdown__image-loading">Loading image...</div>
      )}
    </div>
  );
};

export default ImageRenderer;
