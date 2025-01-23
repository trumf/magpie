import React, {useState, useEffect} from "react";

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
        if (!src) return;

        // If the src is already a blob URL (from ZIP), use it directly
        if (src.startsWith("blob:")) {
          setImageSrc(src);
          return;
        }

        // For directory handle approach
        if (directoryHandle) {
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

  return imageSrc ? (
    <img src={imageSrc} alt={alt} className="markdown__image" />
  ) : (
    <div className="markdown__image-loading">Loading image...</div>
  );
};

export default ImageRenderer;
