// components/reader/Reader.js
import React, {useState} from "react";
import {useApp} from "../../contexts/AppContext";
import Navigation from "./Navigation";
import Content from "./Content";
import Import from "./Import";

const Reader = () => {
  const {isImporting, currentFile} = useApp();
  const [isNavVisible, setIsNavVisible] = useState(true);

  if (isImporting) {
    return <Import />;
  }

  return (
    <div className="reader">
      <Navigation isVisible={isNavVisible} setIsVisible={setIsNavVisible} />
      <main
        className={`reader__content ${
          isNavVisible ? "reader__content--shifted" : ""
        }`}
      >
        {currentFile ? (
          <Content />
        ) : (
          <div className="reader__empty">Select a file</div>
        )}
      </main>
    </div>
  );
};

export default Reader;
