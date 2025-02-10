// components/shared/AnnotationLayer.js
import React from "react";
import {useApp} from "../../contexts/AppContext";

const AnnotationLayer = () => {
  const {annotations, addAnnotation} = useApp();

  return (
    <div className="annotations">{/* Annotation UI implementation */}</div>
  );
};

export default AnnotationLayer;
