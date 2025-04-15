/**
 * MarkdownAnnotation.js
 * A module for handling text annotations in rendered markdown content
 */

import {AnnotationStorage} from "./AnnotationStorage.js";

// Create the AnnotationSystem module using the revealing module pattern
export const AnnotationSystem = (function () {
  // Private variables
  let currentDocument = null;
  let activeAnnotations = [];
  let nextAnnotationId = 1;
  let storage = null;
  let currentFileId = null;
  let currentFilePath = null;

  // Initialize the annotation storage
  function initStorage() {
    if (!storage) {
      storage = new AnnotationStorage({
        statusCallback: (type, message) => {
          console.log(`Annotation Storage: ${type} - ${message}`);
        },
      });
    }
    return storage.initIndexedDB();
  }

  // Generate a unique ID for new annotations
  function generateUniqueId() {
    return `annotation-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  // Private methods
  function createAnnotationElement(type, className, styles = {}) {
    const element = document.createElement(type);
    if (className) element.className = className;

    // Apply styles
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });

    return element;
  }

  // Public methods
  return {
    /**
     * Initialize the annotation system with a document container
     * @param {HTMLElement} documentContainer - The container with rendered markdown
     * @param {number} fileId - The ID of the file being annotated
     * @param {string} filePath - The path of the file being annotated
     */
    initialize: function (documentContainer, fileId, filePath) {
      currentDocument = documentContainer;
      currentFileId = fileId;
      currentFilePath = filePath;

      // Initialize storage and load existing annotations
      this.setupSelectionListener();
      this.loadAnnotations();
    },

    /**
     * Set the current file being viewed
     * @param {number} fileId - The ID of the file
     * @param {string} filePath - The path of the file
     */
    setCurrentFile: function (fileId, filePath) {
      currentFileId = fileId;
      currentFilePath = filePath;

      // Load annotations for this file
      this.loadAnnotations();
    },

    /**
     * Get the current document container
     * @returns {HTMLElement} The document container
     */
    getDocumentContainer: function () {
      return currentDocument;
    },

    /**
     * Get all active annotations
     * @returns {Array} Array of annotation objects
     */
    getAnnotations: function () {
      return [...activeAnnotations];
    },

    /**
     * Load annotations for the current file from storage
     */
    loadAnnotations: async function () {
      if (!currentFileId) return;

      try {
        await initStorage();

        // Clear current annotations first
        activeAnnotations = [];

        // Get annotations for this file from storage
        const fileAnnotations = await storage.getAnnotationsByFile(
          currentFileId
        );

        // Add them to active annotations
        if (fileAnnotations && fileAnnotations.length > 0) {
          activeAnnotations = fileAnnotations;

          // Update the nextAnnotationId
          const maxId = Math.max(
            ...fileAnnotations
              .filter((a) => typeof a.id === "number")
              .map((a) => a.id),
            0
          );

          nextAnnotationId = maxId + 1;

          // Apply highlights for each loaded annotation
          fileAnnotations.forEach((annotation) => {
            this.highlightLoadedAnnotation(annotation);
          });
        }
      } catch (error) {
        console.error("Failed to load annotations:", error);
      }
    },

    /**
     * Highlight text for a loaded annotation using its anchor information
     * @param {Object} annotation - The annotation to highlight
     */
    highlightLoadedAnnotation: function (annotation) {
      if (!currentDocument || !annotation.anchor) return;

      // Try to find the text in the document using the context
      const textNodes = [];
      const walker = document.createTreeWalker(
        currentDocument,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.includes(annotation.anchor.text)) {
          textNodes.push(node);
        }
      }

      // For each potential node, check if it matches our context
      for (const node of textNodes) {
        const nodeContent = node.textContent;
        const index = nodeContent.indexOf(annotation.anchor.text);

        if (index >= 0) {
          // If we can match the context, that's even better
          if (annotation.anchor.context) {
            const contextSize = 30;
            const start = Math.max(0, index - contextSize);
            const end = Math.min(
              nodeContent.length,
              index + annotation.anchor.text.length + contextSize
            );
            const extractedContext = nodeContent.substring(start, end);

            // If context doesn't match well enough, skip to next candidate
            if (
              !extractedContext.includes(annotation.anchor.context) &&
              !annotation.anchor.context.includes(extractedContext)
            ) {
              continue;
            }
          }

          // Create a range for this text
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + annotation.anchor.text.length);

          // Create highlight span
          const highlightEl = createAnnotationElement(
            "span",
            "annotation-highlight",
            {
              backgroundColor: "rgba(255, 255, 0, 0.3)",
              cursor: "pointer",
            }
          );
          highlightEl.dataset.annotationId = annotation.id;

          // Add the annotation text to the highlight
          try {
            highlightEl.appendChild(range.extractContents());
            range.insertNode(highlightEl);

            // Add click event to show the annotation
            highlightEl.addEventListener("click", (e) => {
              e.stopPropagation();
              this.showAnnotationDetails(annotation);
            });

            // We've found a match, no need to continue
            break;
          } catch (e) {
            console.error("Failed to highlight loaded annotation:", e);
          }
        }
      }
    },

    /**
     * Reset the annotation system state
     */
    reset: function () {
      currentDocument = null;
      activeAnnotations = [];
      nextAnnotationId = 1;
      currentFileId = null;
      currentFilePath = null;
    },

    /**
     * Set up event listener for text selection
     */
    setupSelectionListener: function () {
      if (!currentDocument) return;

      currentDocument.addEventListener("pointerup", (e) => {
        const selection = window.getSelection();

        // Only proceed if there's actual text selected
        if (selection.toString().trim().length > 0) {
          // Check if selection is inside our document container
          if (
            currentDocument.contains(
              selection.getRangeAt(0).commonAncestorContainer
            )
          ) {
            // Show annotation UI
            this.showAnnotationPopup(selection, e);
          }
        }
      });
    },

    /**
     * Show a popup menu for creating annotations
     * @param {Selection} selection - The current text selection
     * @param {MouseEvent} mouseEvent - The triggering mouse event
     */
    showAnnotationPopup: function (selection, mouseEvent) {
      // Create a simple popup near the mouse position
      const popup = createAnnotationElement("div", "annotation-popup", {
        position: "absolute",
        left: `${mouseEvent.pageX + 10}px`,
        top: `${mouseEvent.pageY + 10}px`,
        zIndex: "1000",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "3px",
        padding: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      });

      // Add a button to create annotation
      const button = createAnnotationElement("button", null, {
        padding: "5px 10px",
        backgroundColor: "#0366d6",
        color: "white",
        border: "none",
        borderRadius: "3px",
        cursor: "pointer",
      });
      button.textContent = "Add Annotation";

      button.addEventListener("click", () => {
        // Remove the popup
        document.body.removeChild(popup);

        // Show annotation form
        this.showAnnotationForm(selection);
      });

      popup.appendChild(button);
      document.body.appendChild(popup);

      // Close popup when clicking elsewhere
      function handleClickOutside(e) {
        if (!popup.contains(e.target)) {
          if (document.body.contains(popup)) {
            document.body.removeChild(popup);
          }
          document.removeEventListener("mousedown", handleClickOutside);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
    },

    /**
     * Show a form for entering annotation details
     * @param {Selection | null} selection - The current text selection, or null for article note
     */
    showAnnotationForm: function (selection) {
      let selectionText = "";
      let cachedAnchor = null;
      const isArticleAnnotation = selection === null;

      if (!isArticleAnnotation) {
        // Immediately capture the selection text and context before anything else
        selectionText = selection.toString();

        // Store the selection information to preserve it
        cachedAnchor = {
          text: selectionText,
          context: "",
          textPosition: 0,
        };

        // Try to get context if possible
        try {
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const contextRange = range.cloneRange();

            // Try to get some context
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
              contextRange.setStart(
                range.startContainer,
                Math.max(0, range.startOffset - 30)
              );
              contextRange.setEnd(
                range.endContainer,
                Math.min(range.endContainer.length || 0, range.endOffset + 30)
              );
              cachedAnchor.context = contextRange.toString();
              cachedAnchor.textPosition =
                cachedAnchor.context.indexOf(selectionText);
            }
          }
        } catch (e) {
          console.warn("Error capturing context:", e);
          cachedAnchor.context = selectionText;
        }

        console.log("Captured text for annotation:", selectionText);
      } else {
        console.log("Creating an article-level annotation.");
        // No text selection, this is an article note
        selectionText = "Note for entire article"; // Placeholder text
        cachedAnchor = null; // Explicitly set anchor to null for article notes
      }

      // Create a form to enter annotation text
      const form = createAnnotationElement("div", "annotation-form", {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "white",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        zIndex: "1001",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        width: "400px",
      });

      // Selected text display (modified for article notes)
      const selectedTextDisplay = createAnnotationElement("div", null, {
        marginBottom: "10px",
        padding: "8px",
        background: "#f0f0f0",
        borderRadius: "3px",
        fontStyle: "italic",
      });
      selectedTextDisplay.textContent = isArticleAnnotation
        ? "Note for entire article"
        : `"${selectionText}"`;

      // Text area for annotation
      const textarea = createAnnotationElement("textarea", null, {
        width: "100%",
        height: "100px",
        marginBottom: "10px",
        padding: "8px",
        boxSizing: "border-box",
      });
      textarea.placeholder = "Enter your annotation here...";

      // Tags input field
      const tagsLabel = createAnnotationElement("div", null, {
        marginBottom: "5px",
        fontWeight: "bold",
      });
      tagsLabel.textContent = "Tags (separate with commas):";

      const tagsInput = createAnnotationElement("input", null, {
        width: "100%",
        marginBottom: "15px",
        padding: "8px",
        boxSizing: "border-box",
      });
      tagsInput.placeholder = "important, question, todo...";
      tagsInput.type = "text";

      // Buttons
      const buttonContainer = createAnnotationElement("div", null, {
        display: "flex",
        justifyContent: "flex-end",
      });

      const cancelButton = createAnnotationElement("button", null, {
        marginRight: "10px",
        padding: "5px 10px",
        border: "1px solid #ddd",
        borderRadius: "3px",
        backgroundColor: "#f5f5f5",
        cursor: "pointer",
      });
      cancelButton.textContent = "Cancel";

      cancelButton.addEventListener("click", () => {
        document.body.removeChild(form);
      });

      const saveButton = createAnnotationElement("button", null, {
        padding: "5px 10px",
        backgroundColor: "#0366d6",
        color: "white",
        border: "none",
        borderRadius: "3px",
        cursor: "pointer",
      });
      saveButton.textContent = "Save";

      saveButton.addEventListener("click", () => {
        const annotationText = textarea.value.trim();
        if (annotationText) {
          // Process the tags input
          const tagsValue = tagsInput.value.trim();
          const tags = tagsValue
            ? tagsValue
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
            : [];

          // Pass the cachedAnchor (which will be null for article notes)
          this.createAnnotationWithAnchor(cachedAnchor, annotationText, tags);
          document.body.removeChild(form);
        } else {
          textarea.style.borderColor = "red";
        }
      });

      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(saveButton);

      // Add everything to the form
      form.appendChild(selectedTextDisplay); // Use the modified display element
      form.appendChild(textarea);
      form.appendChild(tagsLabel);
      form.appendChild(tagsInput);
      form.appendChild(buttonContainer);
      document.body.appendChild(form);

      // Focus the textarea
      textarea.focus();
    },

    /**
     * Create text anchoring information from a selection
     * @param {Selection} selection - The text selection to anchor
     * @returns {Object} Anchor information
     */
    createAnchor: function (selection) {
      // Get the selected text first
      const selectedText = selection.toString().trim();

      // Early validation to catch empty selections
      if (!selectedText) {
        console.error("Cannot create anchor: Empty selection");
        return {
          text: "",
          context: "",
          textPosition: 0,
        };
      }

      try {
        // Get the range for this selection
        if (selection.rangeCount === 0) {
          console.error("Selection has no ranges");
          return {
            text: selectedText,
            context: selectedText,
            textPosition: 0,
          };
        }

        const range = selection.getRangeAt(0);

        // Validate range
        if (!range || !range.startContainer || !range.endContainer) {
          console.error("Invalid range in selection");
          return {
            text: selectedText,
            context: selectedText,
            textPosition: 0,
          };
        }

        // Get context (characters before and after)
        const contextRange = range.cloneRange();

        // Try to expand to get context (30 chars or so)
        try {
          // Move start back by 30 chars if possible
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const startOffset = Math.max(0, range.startOffset - 30);
            contextRange.setStart(range.startContainer, startOffset);
          }

          // Move end forward by 30 chars if possible
          if (range.endContainer.nodeType === Node.TEXT_NODE) {
            const maxLength = range.endContainer.length || 0;
            const endOffset = Math.min(maxLength, range.endOffset + 30);
            contextRange.setEnd(range.endContainer, endOffset);
          }
        } catch (e) {
          console.warn("Error expanding range for context:", e);
          // Fall back to the original range
          contextRange.setStart(range.startContainer, range.startOffset);
          contextRange.setEnd(range.endContainer, range.endOffset);
        }

        const context = contextRange.toString();
        const textPosition = context.indexOf(selectedText);

        // If we can't find the exact text in the context (rare edge case),
        // just use the text itself as the context
        if (textPosition === -1) {
          console.warn(
            "Selected text not found in context, using text as context"
          );
          return {
            text: selectedText,
            context: selectedText,
            textPosition: 0,
          };
        }

        console.log(
          "Anchor created successfully with text:",
          selectedText.substring(0, 20) + "..."
        );
        return {
          text: selectedText,
          context: context,
          textPosition: textPosition,
        };
      } catch (error) {
        console.error("Error creating anchor:", error);
        // Return a minimal valid anchor
        return {
          text: selectedText,
          context: selectedText,
          textPosition: 0,
        };
      }
    },

    /**
     * Create a new annotation using pre-captured anchor data or null for article note
     * @param {Object | null} anchor - The pre-captured anchor information or null
     * @param {string} annotationText - The annotation content
     * @param {Array} tags - Optional array of tags for the annotation
     * @returns {Object} The created annotation
     */
    createAnnotationWithAnchor: async function (
      anchor, // Can be null
      annotationText,
      tags = []
    ) {
      // Skip if no file is currently set
      if (!currentFileId || !currentFilePath) {
        console.error(
          "Cannot create annotation: No file is currently selected"
        );
        return null;
      }

      // Check for empty annotation text
      if (!annotationText || annotationText.trim() === "") {
        console.error("Cannot create annotation: Empty content");
        return null;
      }

      // Validate anchor only if it's not null (i.e., not an article annotation)
      if (anchor && (!anchor.text || anchor.text.trim() === "")) {
        console.error("Cannot create text annotation: Empty anchor text");
        return null;
      }

      // Create a unique string ID for this annotation
      const stringId = generateUniqueId();
      const numericId = nextAnnotationId++; // Still need a unique ID

      if (anchor) {
        console.log("Creating annotation with anchor text:", anchor.text);
      } else {
        console.log("Creating article-level annotation");
      }

      // Create the annotation object (anchor will be null for article notes)
      const annotation = {
        id: stringId,
        numericId: numericId,
        anchor: anchor, // Will be null for article notes
        content: annotationText,
        tags: tags,
        dateCreated: new Date(),
        fileId: currentFileId,
        filePath: currentFilePath,
      };

      try {
        // Save to storage
        await initStorage();
        await storage.saveAnnotation(annotation);

        // Add to our in-memory array
        activeAnnotations.push(annotation);

        // Apply the highlight *only* if it's not an article annotation (i.e., anchor exists)
        if (anchor) {
          this.highlightAnnotationFromAnchor(annotation);
        }

        return annotation;
      } catch (error) {
        console.error("Failed to save annotation:", error);
        return null;
      }
    },

    /**
     * Highlight text in the document using anchor information
     * @param {Object} annotation - The annotation with anchor information
     * @returns {boolean} Success indicator
     */
    highlightAnnotationFromAnchor: function (annotation) {
      try {
        // Check anchor exists (will skip for article notes)
        if (!currentDocument || !annotation.anchor || !annotation.anchor.text) {
          // console.error("Cannot highlight: Missing document or anchor text"); // Commented out for article notes
          return false;
        }

        const textToFind = annotation.anchor.text;
        console.log("Attempting to highlight text:", textToFind);

        // Find the text in the document using TreeWalker
        const textNodes = [];
        const walker = document.createTreeWalker(
          currentDocument,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.includes(textToFind)) {
            textNodes.push(node);
          }
        }

        if (textNodes.length === 0) {
          console.error("Text not found in document:", textToFind);
          return false;
        }

        // Use the first matching node
        const nodeToHighlight = textNodes[0];
        const index = nodeToHighlight.textContent.indexOf(textToFind);

        // Create a range for this text
        const range = document.createRange();
        range.setStart(nodeToHighlight, index);
        range.setEnd(nodeToHighlight, index + textToFind.length);

        // Create highlight span
        const highlightEl = createAnnotationElement(
          "span",
          "annotation-highlight",
          {
            backgroundColor: "rgba(255, 255, 0, 0.3)",
            cursor: "pointer",
          }
        );
        highlightEl.dataset.annotationId = annotation.id;
        highlightEl.dataset.annotationText = textToFind.substring(0, 50);

        try {
          highlightEl.appendChild(range.extractContents());
          range.insertNode(highlightEl);
          console.log("Successfully highlighted text");
        } catch (e) {
          console.error("Failed to highlight text:", e);
          return false;
        }

        // Add click event to show the annotation
        highlightEl.addEventListener("click", (e) => {
          e.stopPropagation();
          this.showAnnotationDetails(annotation);
        });

        return true;
      } catch (error) {
        console.error("Error highlighting from anchor:", error);
        return false;
      }
    },

    /**
     * Create a new annotation
     * @param {Selection} selection - The text selection to annotate
     * @param {string} annotationText - The annotation content
     * @returns {Object} The created annotation
     */
    createAnnotation: async function (selection, annotationText) {
      // Skip if no file is currently set
      if (!currentFileId || !currentFilePath) {
        console.error(
          "Cannot create annotation: No file is currently selected"
        );
        return null;
      }

      // Create a unique string ID for this annotation
      const stringId = generateUniqueId();
      const numericId = nextAnnotationId++;

      // Immediately capture the selected text to prevent loss
      const selectedText = selection.toString();
      console.log("Selected text for annotation:", selectedText);

      // Create anchor information
      const anchor = this.createAnchor(selection);

      // Add a safeguard in case anchor creation failed
      if (!anchor.text || anchor.text.trim() === "") {
        console.warn("Anchor text is empty, using selectedText as fallback");
        anchor.text = selectedText;
        anchor.context = selectedText;
        anchor.textPosition = 0;
      }

      // Create the annotation object
      const annotation = {
        id: stringId,
        numericId: numericId,
        anchor: anchor,
        content: annotationText,
        dateCreated: new Date(),
        fileId: currentFileId,
        filePath: currentFilePath,
      };

      try {
        // Save to storage
        await initStorage();
        await storage.saveAnnotation(annotation);

        // Add to our in-memory array
        activeAnnotations.push(annotation);

        // Apply the highlight to the document
        this.highlightAnnotation(selection, annotation);

        return annotation;
      } catch (error) {
        console.error("Failed to save annotation:", error);
        return null;
      }
    },

    /**
     * Highlight text in the document
     * @param {Selection} selection - The text selection to highlight
     * @param {Object} annotation - The annotation object
     * @returns {boolean} Success indicator
     */
    highlightAnnotation: function (selection, annotation) {
      try {
        // Verify we have a valid selection
        if (!selection || selection.rangeCount === 0) {
          console.error("Invalid selection for highlighting");
          return false;
        }

        const range = selection.getRangeAt(0);

        // Verify the range is valid
        if (!range || !range.startContainer || !range.endContainer) {
          console.error("Invalid range for highlighting");
          return false;
        }

        // Create a highlight element
        const highlightEl = createAnnotationElement(
          "span",
          "annotation-highlight",
          {
            backgroundColor: "rgba(255, 255, 0, 0.3)",
            cursor: "pointer",
          }
        );
        highlightEl.dataset.annotationId = annotation.id;

        // Store original range contents in the highlight
        try {
          // Add the annotation text directly as a data attribute for debugging
          highlightEl.dataset.annotationText = annotation.anchor.text.substring(
            0,
            50
          );

          // Extract the contents and add to highlight
          const contents = range.extractContents();
          if (!contents || contents.textContent.trim() === "") {
            console.error("Extracted contents are empty");
            // Try to recreate contents from the annotation text
            const textNode = document.createTextNode(annotation.anchor.text);
            highlightEl.appendChild(textNode);
          } else {
            highlightEl.appendChild(contents);
          }

          range.insertNode(highlightEl);
        } catch (e) {
          console.error("Failed to highlight range:", e);
          return false;
        }

        // Add click event to show the annotation
        highlightEl.addEventListener("click", (e) => {
          e.stopPropagation();
          this.showAnnotationDetails(annotation);
        });

        // Remove the current selection
        try {
          window.getSelection().removeAllRanges();
        } catch (e) {
          console.warn("Error clearing selection:", e);
        }

        return true;
      } catch (error) {
        console.error("Highlighting error:", error);
        return false;
      }
    },

    /**
     * Show details for a specific annotation
     * @param {Object} annotation - The annotation to display
     */
    showAnnotationDetails: function (annotation) {
      // Create a popup with annotation details
      const popup = createAnnotationElement("div", "annotation-details", {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "white",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        zIndex: "1001",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        width: "400px",
      });

      // Display "Article Note" or the anchored text
      const textEl = createAnnotationElement("div", null, {
        marginBottom: "15px",
        padding: "10px",
        background: "#f0f0f0",
        borderRadius: "3px",
        fontStyle: "italic", // Keep italic style
      });
      textEl.textContent = annotation.anchor
        ? `"${annotation.anchor.text}"` // Text annotation
        : "Note for entire article"; // Article annotation

      // Annotation content
      const contentEl = createAnnotationElement("div", null, {
        marginBottom: "15px",
        whiteSpace: "pre-wrap", // Preserve whitespace/newlines
      });
      contentEl.textContent = annotation.content;

      // Tags (if any)
      if (annotation.tags && annotation.tags.length > 0) {
        const tagsContainer = createAnnotationElement(
          "div",
          "annotation-tags-container",
          {
            marginBottom: "15px",
            display: "flex",
            flexWrap: "wrap",
            gap: "5px",
          }
        );

        const tagsLabel = createAnnotationElement("div", null, {
          marginRight: "5px",
          fontSize: "12px",
          color: "#666",
        });
        tagsLabel.textContent = "Tags:";
        tagsContainer.appendChild(tagsLabel);

        // Create a tag element for each tag
        annotation.tags.forEach((tag) => {
          const tagEl = createAnnotationElement("span", "annotation-tag", {
            padding: "2px 8px",
            backgroundColor: "#e1f5fe",
            color: "#0277bd",
            borderRadius: "12px",
            fontSize: "12px",
          });
          tagEl.textContent = tag;
          tagsContainer.appendChild(tagEl);
        });

        popup.appendChild(tagsContainer);
      }

      // Date
      const dateEl = createAnnotationElement("div", null, {
        fontSize: "12px",
        color: "#666",
        marginBottom: "15px",
      });
      dateEl.textContent = `Created: ${annotation.dateCreated.toLocaleString()}`;

      // Buttons container
      const buttonContainer = createAnnotationElement("div", null, {
        display: "flex",
        justifyContent: "space-between",
      });

      // Delete button
      const deleteButton = createAnnotationElement("button", null, {
        padding: "5px 10px",
        backgroundColor: "#dc3545",
        color: "white",
        border: "none",
        borderRadius: "3px",
        cursor: "pointer",
      });
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this annotation?")) {
          try {
            await initStorage();
            await storage.deleteAnnotation(annotation.id);

            // Remove from in-memory array
            activeAnnotations = activeAnnotations.filter(
              (a) => a.id !== annotation.id
            );

            // Remove highlight from DOM (only if it exists)
            if (annotation.anchor) {
              const highlight = document.querySelector(
                `.annotation-highlight[data-annotation-id="${annotation.id}"]`
              );
              if (highlight) {
                // Replace the highlight with its content
                const parent = highlight.parentNode;
                while (highlight.firstChild) {
                  parent.insertBefore(highlight.firstChild, highlight);
                }
                parent.removeChild(highlight);
              }
            }

            // Close the popup
            document.body.removeChild(popup);
          } catch (error) {
            console.error("Failed to delete annotation:", error);
          }
        }
      });

      // Close button
      const closeButton = createAnnotationElement("button", null, {
        padding: "5px 10px",
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "3px",
        cursor: "pointer",
      });
      closeButton.textContent = "Close";

      closeButton.addEventListener("click", () => {
        document.body.removeChild(popup);
      });

      buttonContainer.appendChild(deleteButton);
      buttonContainer.appendChild(closeButton);

      // Add everything to the popup
      popup.appendChild(textEl); // Add the potentially modified text element
      popup.appendChild(contentEl);
      popup.appendChild(dateEl);
      popup.appendChild(buttonContainer);
      document.body.appendChild(popup);

      // Close when clicking outside
      function handleClickOutside(e) {
        if (!popup.contains(e.target)) {
          if (document.body.contains(popup)) {
            document.body.removeChild(popup);
          }
          document.removeEventListener("mousedown", handleClickOutside);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
    },

    /**
     * Update the annotations panel with current annotations
     */

    /**
     * Scroll to a specific annotation in the document
     * @param {Object} annotation - The annotation to scroll to
     */
    scrollToAnnotation: function (annotation) {
      const highlight = document.querySelector(
        `.annotation-highlight[data-annotation-id="${annotation.id}"]`
      );
      if (highlight) {
        highlight.scrollIntoView({behavior: "smooth", block: "center"});

        // Flash effect to draw attention
        const originalColor = highlight.style.backgroundColor;
        highlight.style.backgroundColor = "rgba(255, 255, 0, 0.8)";
        setTimeout(() => {
          highlight.style.backgroundColor = originalColor;
        }, 1500);
      }
    },

    /**
     * Trigger the annotation form for creating an article-level note
     */
    createArticleAnnotation: function () {
      // Call showAnnotationForm with null selection to indicate article note
      this.showAnnotationForm(null);
    },
  };
})();
