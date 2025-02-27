// components/shared/ImageRenderer.js
/*
ImageRenderer - Specialized component for rendering images that:

Handles different image source types (URL, blob, asset protocol)
Manages loading and error states for images
Works with the AssetService to retrieve stored images
*/

import React, {useState, useEffect} from "react";
import {getAssetService} from "../../services/AssetService";
import styles from "./ImageRenderer.module.css";

const isExternalUrl = (url) => {
  return url.startsWith("http://") || url.startsWith("https://");
};

const ImageRenderer = ({src, alt}) => {
  const [imageSrc, setImageSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!src) {
        setLoading(false);
        return;
      }

      try {
        // Handle external URLs directly
        if (isExternalUrl(src)) {
          setImageSrc(src);
          setLoading(false);
          return;
        }

        // Handle blob URLs
        if (src.startsWith("blob:")) {
          setImageSrc(src);
          setLoading(false);
          return;
        }

        // Handle internal asset:// protocol
        if (src.startsWith("asset://")) {
          const assetId = src.replace("asset://", "");
          const assetService = await getAssetService();
          const assetUrl = await assetService.getAsset(assetId);

          if (assetUrl && isMounted) {
            setImageSrc(assetUrl);
          } else if (isMounted) {
            setError(`Asset not found: ${assetId}`);
          }

          setLoading(false);
          return;
        }

        // Default: try to use the src as provided
        setImageSrc(src);
        setLoading(false);
      } catch (err) {
        console.error("Error loading image:", err);
        if (isMounted) {
          setError(`Failed to load image: ${err.message}`);
          setLoading(false);
        }
      }
    };

    setLoading(true);
    setError(null);
    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (loading) {
    return <div className={styles.loading}>Loading image...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <img
        src={imageSrc}
        alt={alt || ""}
        className={styles.image}
        loading="lazy"
        onError={() => setError(`Failed to load image: ${src}`)}
      />
    </div>
  );
};

export default React.memo(ImageRenderer);
