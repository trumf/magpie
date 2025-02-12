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

  useEffect(() => {
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
            // Get the directory parts from the markdown file path
            const markdownPathParts = decodePath(filePath).split("/");
            const markdownDir = markdownPathParts.slice(0, -1).join("/");

            // Get the image path relative to the markdown file
            const decodedSrc = decodePath(src);
            const imagePath = decodedSrc.startsWith("/")
              ? decodedSrc.slice(1)
              : decodedSrc;

            console.log("Image path details:", {
              markdownDir,
              imagePath,
              decodedSrc,
            });

            let currentHandle = directoryHandle;

            // First navigate to markdown file's directory if needed
            if (markdownDir) {
              for (const part of markdownDir.split("/").filter(Boolean)) {
                console.log("Navigating to directory:", part);
                currentHandle = await currentHandle.getDirectoryHandle(part);
              }
            }

            // Then navigate to the image
            const imagePathParts = imagePath.split("/").filter(Boolean);
            for (let i = 0; i < imagePathParts.length; i++) {
              const part = imagePathParts[i];
              if (i === imagePathParts.length - 1) {
                console.log("Getting file:", part);
                currentHandle = await currentHandle.getFileHandle(part);
              } else {
                console.log("Navigating to subdirectory:", part);
                currentHandle = await currentHandle.getDirectoryHandle(part);
              }
            }

            // Get the image file and create a blob URL
            const file = await currentHandle.getFile();
            const blob = new Blob([await file.arrayBuffer()], {
              type: file.type || "image/png",
            });
            const url = URL.createObjectURL(blob);
            console.log("Created blob URL:", url);
            setImageSrc(url);
            setError(null);
          } catch (error) {
            console.error("Error loading local image:", error);
            // If local file fails, try using the src directly
            setImageSrc(src);
          }
        } else {
          // No directory handle, try using src directly
          setImageSrc(src);
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
        <div className="markdown__image-loading">Loading image...</div>
      )}
    </div>
  );
};

export default ImageRenderer;
