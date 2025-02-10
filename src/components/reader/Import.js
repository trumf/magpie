// components/reader/Import.js
import React, {useState, useRef} from "react";
import {useApp} from "../../contexts/AppContext";
import {Upload} from "lucide-react";

const Import = () => {
  const {handleImport} = useApp();
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const onFileSelect = async (event) => {
    try {
      setError("");
      await handleImport(Array.from(event.target.files));
    } catch (error) {
      console.error("Import error:", error);
      setError("Import failed. Please try again.");
    }
  };

  return (
    <div className="import">
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileSelect}
        accept=".md"
        multiple
        style={{display: "none"}}
      />
      <button
        className="import__button"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload />
        Import Files
      </button>
      {error && <div className="import__error">{error}</div>}
    </div>
  );
};

export default Import;
