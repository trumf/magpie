/**
 * MarkdownAnnotation.js
 * A module for handling text annotations in rendered markdown content
 */

import {AnnotationStorage} from "./AnnotationStorage.js";
import {
  showAnnotationForm,
  showAnnotationDetails,
  showMobileAnnotationForm,
  showAnnotationPopup,
  initMobileAnnotationStyles,
  setupTagAutocomplete,
  showStatusIndicator,
} from "./annotationPanel.js";

// Create the AnnotationSystem module using the revealing module pattern
export const AnnotationSystem = (function () {
  // Private variables
  let currentDocument = null;
  let activeAnnotations = [];
  let nextAnnotationId = 1;
  let storage = null;
  let currentFileId = null;
  let currentFilePath = null;
  let allTagsCache = []; // Cache for tags to reduce DB lookups

  // Check if the client is using a mobile device
  function isMobileDevice() {
    return (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
  }

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

  // Private method to fetch all tags for autocomplete
  async function fetchAllTags() {
    // Use cache or fetch tags
    if (allTagsCache.length === 0) {
      try {
        await initStorage();
        allTagsCache = await storage.getAllTags();
      } catch (error) {
        console.error("Failed to fetch tags:", error);
        allTagsCache = []; // Reset cache on error
      }
    }
    return allTagsCache;
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
      if (isMobileDevice()) {
        this.setupMobileAnnotations();
      } else {
        this.setupSelectionListener();
      }
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

      let selectionTimeout;

      // Use selectionchange for better cross-device compatibility
      document.addEventListener("selectionchange", () => {
        clearTimeout(selectionTimeout);

        selectionTimeout = setTimeout(() => {
          const selection = window.getSelection();

          // Check if selection is valid and within the document
          if (
            selection &&
            !selection.isCollapsed && // Ensure something is actually selected
            selection.toString().trim().length > 0 &&
            currentDocument.contains(selection.anchorNode) // Check if selection starts within the container
          ) {
            // Get position from the selection range
            try {
              const range = selection.getRangeAt(0);

              // Get a more accurate center position for multiline selections
              const rects = range.getClientRects();
              const minLeft = Math.min(...[...rects].map((r) => r.left));
              const maxRight = Math.max(...[...rects].map((r) => r.right));
              const centerX = (minLeft + maxRight) / 2 + window.scrollX;

              const rect = range.getBoundingClientRect();
              const position = {
                x: centerX, // Use the calculated center point
                y: rect.bottom + window.scrollY, // Position popup below the selection
              };
              this.showAnnotationPopup(selection, position);
            } catch (e) {
              console.error("Error getting selection range bounds:", e);
            }
          } else {
            // Optional: If selection is cleared or invalid, remove any existing popup
            const existingPopup = document.querySelector(".annotation-popup");
            if (existingPopup) {
              document.body.removeChild(existingPopup);
            }
          }
        }, 150); // Debounce: Wait 150ms after last change
      });
    },

    /**
     * Show a popup menu for creating annotations
     * @param {Selection} selection - The current text selection
     * @param {{x: number, y: number}} position - The position to show the popup
     */
    showAnnotationPopup: function (selection, position) {
      // Use the showAnnotationPopup function from the annotationPanel module
      showAnnotationPopup(selection, position, (selection) => {
        this.showAnnotationForm(selection);
      });
    },

    /**
     * Show a form for entering annotation details
     * @param {Selection | null} selection - The current text selection, or null for article note
     */
    showAnnotationForm: function (selection) {
      // Use the showAnnotationForm function from the annotationPanel module
      showAnnotationForm(selection, {
        save: ({anchor, text, tags}) => {
          // Pass the anchor (which will be null for article notes)
          this.createAnnotationWithAnchor(anchor, text, tags);
        },
        cancel: () => {
          // Nothing to do on cancel
        },
        setupTagAutocomplete: (inputElement, containerElement, isMobile) => {
          setupTagAutocomplete(
            inputElement,
            containerElement,
            isMobile,
            fetchAllTags
          );
        },
      });
    },

    /**
     * Show details for a specific annotation
     * @param {Object} annotation - The annotation to display
     */
    showAnnotationDetails: function (annotation) {
      // Use the showAnnotationDetails function from the annotationPanel module
      showAnnotationDetails(annotation, {
        delete: async (annotation) => {
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
          } catch (error) {
            console.error("Failed to delete annotation:", error);
          }
        },
        close: () => {
          // Nothing to do on close
        },
      });
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

      // Check that we have either text or tags
      if (
        (!annotationText || annotationText.trim() === "") &&
        tags.length === 0
      ) {
        console.error("Cannot create annotation: Need either text or tags");
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
     * Set up mobile-friendly annotation mode
     */
    setupMobileAnnotations: function () {
      if (!currentDocument) return;

      // Add mobile-specific styles
      initMobileAnnotationStyles();

      // Only open a new panel if none is already open
      currentDocument.addEventListener("click", (e) => {
        // If a panel exists, do nothing here (outside handler will close it)
        if (document.querySelector(".mobile-annotation-form")) return;

        const targetElem = e.target.closest("p, h1, h2, h3, h4, h5, h6");
        if (!targetElem) return;

        // Highlight and open _only_ when no panel is open
        document
          .querySelectorAll(".temp-selected")
          .forEach((el) => el.classList.remove("temp-selected"));
        targetElem.classList.add("temp-selected");
        this.showMobileAnnotationForm(targetElem);
      });

      // Show an initial status indicator to let the user know annotation mode is active
      showStatusIndicator("Tap any text to annotate");
    },

    /**
     * Show mobile annotation form for a selected element
     * @param {HTMLElement} element - The selected element to annotate
     */
    showMobileAnnotationForm: function (element) {
      // Use the showMobileAnnotationForm function from the annotationPanel module
      showMobileAnnotationForm(element, {
        save: ({anchor, text, tags}) => {
          // Create and save the annotation
          this.createAnnotationWithAnchor(anchor, text, tags);
        },
        cancel: () => {
          // Nothing to do on cancel
        },
        setupTagAutocomplete: (inputElement, containerElement, isMobile) => {
          setupTagAutocomplete(
            inputElement,
            containerElement,
            isMobile,
            fetchAllTags
          );
        },
        showStatusIndicator: showStatusIndicator,
      });
    },
  };
})();
