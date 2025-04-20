/**
 * annotationPanel.js
 * A module for handling UI elements related to annotation forms and panels
 */

/**
 * Helper function to create DOM elements with styles
 * @param {string} type - Element type (div, button, etc.)
 * @param {string} className - Optional CSS class name
 * @param {Object} styles - Optional styles object
 * @returns {HTMLElement} The created element
 */
function createAnnotationElement(type, className, styles = {}) {
  const element = document.createElement(type);
  if (className) element.className = className;

  // Apply styles
  Object.entries(styles).forEach(([property, value]) => {
    element.style[property] = value;
  });

  return element;
}

/**
 * Show a form for entering annotation details
 * @param {Selection | null} selection - The current text selection, or null for article note
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.save - Called when saving an annotation
 * @param {Function} callbacks.cancel - Called when canceling
 * @param {Function} callbacks.setupTagAutocomplete - Function to set up tag autocomplete
 */
export function showAnnotationForm(selection, callbacks) {
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

  // --- Autocomplete Tags ---
  const tagsContainer = createAnnotationElement("div", "tags-input-container", {
    position: "relative", // Needed for absolute positioning of dropdown
    marginBottom: "15px",
  });

  const tagsLabel = createAnnotationElement("div", null, {
    marginBottom: "5px",
    fontWeight: "bold",
  });
  tagsLabel.textContent = "Tags (separate with commas):";

  const tagsInput = createAnnotationElement("input", null, {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
  });
  tagsInput.placeholder = "important, question, todo...";
  tagsInput.type = "text";
  tagsInput.setAttribute("autocomplete", "off");
  tagsInput.setAttribute("autocorrect", "off");
  tagsInput.setAttribute("autocapitalize", "off");
  tagsInput.setAttribute("spellcheck", "false");

  tagsContainer.appendChild(tagsLabel);
  tagsContainer.appendChild(tagsInput);

  // Add autocomplete logic
  callbacks.setupTagAutocomplete(tagsInput, tagsContainer, false);
  // --- End Autocomplete Tags ---

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
    callbacks.cancel();
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
    const tagsValue = tagsInput.value.trim();
    const tags = tagsValue
      ? tagsValue
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    // Allow save if there's text OR at least one tag
    if (annotationText || tags.length > 0) {
      // Pass the cachedAnchor (which will be null for article notes)
      callbacks.save({
        anchor: cachedAnchor,
        text: annotationText, // may be empty
        tags: tags,
      });
      document.body.removeChild(form);
    } else {
      // Highlight both fields if completely empty
      textarea.style.borderColor = "red";
      tagsInput.style.borderColor = "red";
    }
  });

  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(saveButton);

  // Add everything to the form
  form.appendChild(selectedTextDisplay); // Use the modified display element
  form.appendChild(textarea);
  form.appendChild(tagsContainer); // Add the container with label and input
  form.appendChild(buttonContainer);
  document.body.appendChild(form);

  // Focus the textarea
  textarea.focus();
}

/**
 * Show details for a specific annotation
 * @param {Object} annotation - The annotation to display
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.delete - Called when deleting an annotation
 * @param {Function} callbacks.close - Called when closing the panel
 */
export function showAnnotationDetails(annotation, callbacks) {
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

  deleteButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this annotation?")) {
      callbacks.delete(annotation);
      document.body.removeChild(popup);
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
    callbacks.close();
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
        callbacks.close();
      }
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
}

/**
 * Show mobile annotation form for a selected element
 * @param {HTMLElement} element - The selected element to annotate
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.save - Called when saving an annotation
 * @param {Function} callbacks.cancel - Called when canceling
 * @param {Function} callbacks.setupTagAutocomplete - Function to set up tag autocomplete
 * @param {Function} callbacks.showStatusIndicator - Function to show status indicators
 */
export function showMobileAnnotationForm(element, callbacks) {
  // Remove existing form if present
  const existingForm = document.querySelector(".mobile-annotation-form");
  if (existingForm) {
    existingForm.remove();
  }

  // Get text content from the selected element
  const selectedText = element.textContent.trim();

  // Create the mobile annotation form
  const form = document.createElement("div");
  form.className = "mobile-annotation-form";

  // Selected text display
  const selectedTextDisplay = document.createElement("div");
  Object.assign(selectedTextDisplay.style, {
    backgroundColor: "#f8f9fa",
    padding: "12px",
    borderLeft: "4px solid #4285f4",
    marginBottom: "15px",
    borderRadius: "4px",
    fontSize: "14px",
    maxHeight: "100px",
    overflowY: "auto",
  });
  selectedTextDisplay.textContent = selectedText;

  // Text area for annotation
  const textarea = document.createElement("textarea");
  Object.assign(textarea.style, {
    width: "100%",
    height: "80px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    marginBottom: "15px",
    fontFamily: "inherit",
    boxSizing: "border-box",
  });
  textarea.placeholder = "Add your annotation here...";

  // Tags input field
  const tagsLabel = document.createElement("div");
  Object.assign(tagsLabel.style, {
    marginBottom: "5px",
    fontWeight: "bold",
  });
  tagsLabel.textContent = "Tags (separate with commas):";

  const tagsInput = document.createElement("input");
  Object.assign(tagsInput.style, {
    width: "100%",
    marginBottom: "15px",
    padding: "8px",
    boxSizing: "border-box",
    border: "1px solid #ddd",
    borderRadius: "4px",
  });
  tagsInput.placeholder = "important, question, todo...";
  tagsInput.type = "text";
  tagsInput.setAttribute("autocomplete", "off");
  tagsInput.setAttribute("autocorrect", "off");
  tagsInput.setAttribute("autocapitalize", "off");
  tagsInput.setAttribute("spellcheck", "false");

  // --- Autocomplete Tags ---
  const tagsContainer = createAnnotationElement("div", "tags-input-container", {
    position: "relative", // Needed for absolute positioning of dropdown
    marginBottom: "15px",
  });
  tagsContainer.appendChild(tagsLabel);
  tagsContainer.appendChild(tagsInput);

  // Add autocomplete logic (mobile version - dropdown above)
  callbacks.setupTagAutocomplete(tagsInput, tagsContainer, true);
  // --- End Autocomplete Tags ---

  // Buttons container
  const buttonContainer = document.createElement("div");
  Object.assign(buttonContainer.style, {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  });

  // Cancel button
  const cancelButton = document.createElement("button");
  Object.assign(cancelButton.style, {
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#f1f3f4",
    color: "#333",
  });
  cancelButton.textContent = "Cancel";

  // Save button
  const saveButton = document.createElement("button");
  Object.assign(saveButton.style, {
    padding: "10px 15px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#4285f4",
    color: "white",
  });
  saveButton.textContent = "Save";

  // Function to clean up and close the form
  const closeForm = () => {
    form.classList.remove("visible");
    element.classList.remove("temp-selected");
    if (handleOutsideClick) {
      document.removeEventListener("pointerdown", handleOutsideClick);
    }
    setTimeout(() => form.remove(), 300);
    callbacks.cancel();
  };

  // Add event listeners
  cancelButton.addEventListener("click", closeForm);

  saveButton.addEventListener("click", () => {
    const annotationText = textarea.value.trim();
    const tagsValue = tagsInput.value.trim();
    const tags = tagsValue
      ? tagsValue
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    // Allow save if there's text OR at least one tag
    if (annotationText || tags.length > 0) {
      // Create anchor for the paragraph
      const anchor = {
        text: selectedText,
        context: selectedText,
        textPosition: 0,
      };

      // Create and save the annotation
      callbacks.save({
        anchor,
        text: annotationText, // may be empty
        tags,
      });

      // Hide and remove form
      form.classList.remove("visible");
      setTimeout(() => form.remove(), 300);

      // Remove selection highlight
      element.classList.remove("temp-selected");

      // Remove outside click handler
      if (handleOutsideClick) {
        document.removeEventListener("pointerdown", handleOutsideClick);
      }

      // Show confirmation
      callbacks.showStatusIndicator("Annotation saved!");
    } else {
      // Highlight both fields if completely empty
      textarea.style.borderColor = "red";
      tagsInput.style.borderColor = "red";
    }
  });

  // Build the form
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(saveButton);

  form.appendChild(selectedTextDisplay);
  form.appendChild(textarea);
  form.appendChild(tagsContainer); // Add container for tags
  form.appendChild(buttonContainer);

  // Add to document
  document.body.appendChild(form);

  // Trigger animation after a brief delay
  setTimeout(() => form.classList.add("visible"), 10);

  // Focus the textarea
  setTimeout(() => textarea.focus(), 300);

  // Add outside click handler to close the form
  let handleOutsideClick;

  // Wait a tick to set up the click outside handler to prevent immediate closing
  setTimeout(() => {
    handleOutsideClick = (e) => {
      // If the click is outside the form, close it
      if (form && !form.contains(e.target) && e.target !== element) {
        closeForm();
      }
    };

    // Use pointerdown to handle both touch and mouse events
    document.addEventListener("pointerdown", handleOutsideClick);
  }, 100); // Small delay to prevent immediate triggering
}

/**
 * Initialize mobile annotation styles
 */
export function initMobileAnnotationStyles() {
  // Add CSS for annotation mode
  const style = document.createElement("style");
  style.textContent = `
    .annotation-mode * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    .annotation-mode p, 
    .annotation-mode h1, 
    .annotation-mode h2, 
    .annotation-mode h3, 
    .annotation-mode h4, 
    .annotation-mode h5, 
    .annotation-mode h6 {
      cursor: pointer;
    }
    
    .temp-selected {
      background-color: rgba(66, 133, 244, 0.2);
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .mobile-annotation-form {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      padding: 20px;
      box-shadow: 0 -4px 10px rgba(0,0,0,0.1);
      z-index: 200;
      border-top-left-radius: 15px;
      border-top-right-radius: 15px;
      transform: translateY(100%);
      transition: transform 0.3s ease-out;
    }
    
    .mobile-annotation-form.visible {
      transform: translateY(0);
    }
    
    .status-indicator {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 1000;
      transition: opacity 0.3s;
      opacity: 0;
      pointer-events: none;
    }
    
    .status-indicator.visible {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Sets up tag autocomplete functionality for an input field.
 * @param {HTMLInputElement} inputElement - The input field for tags.
 * @param {HTMLElement} containerElement - The container holding the input and dropdown.
 * @param {boolean} isMobile - Flag indicating if it's the mobile version (dropdown above).
 * @param {Function} fetchTags - Function to fetch tag suggestions
 */
export function setupTagAutocomplete(
  inputElement,
  containerElement,
  isMobile,
  fetchTags
) {
  let autocompleteList = containerElement.querySelector(".autocomplete-list");
  if (!autocompleteList) {
    autocompleteList = createAnnotationElement("div", "autocomplete-list", {
      position: "absolute",
      border: "1px solid #ccc",
      background: "white",
      zIndex: "1002", // Above form
      maxHeight: "150px",
      overflowY: "auto",
      width: "100%", // Match input width
      boxSizing: "border-box",
      display: "none", // Initially hidden
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    });
    if (isMobile) {
      autocompleteList.style.bottom = "100%"; // Position above input
      autocompleteList.style.marginBottom = "2px";
    } else {
      autocompleteList.style.top = "100%"; // Position below input
      autocompleteList.style.marginTop = "2px";
    }
    containerElement.appendChild(autocompleteList); // Append to container
  }

  const renderSuggestions = (suggestions) => {
    autocompleteList.innerHTML = ""; // Clear previous suggestions
    if (suggestions.length === 0) {
      autocompleteList.style.display = "none";
      return;
    }

    suggestions.forEach((tag) => {
      const item = createAnnotationElement("div", "autocomplete-item", {
        padding: "8px",
        cursor: "pointer",
      });
      item.textContent = tag;
      item.addEventListener("mouseenter", () => {
        item.style.backgroundColor = "#f0f0f0";
      });
      item.addEventListener("mouseleave", () => {
        item.style.backgroundColor = "white";
      });
      item.addEventListener("mousedown", (e) => {
        // Use mousedown to fire before blur
        e.preventDefault(); // Prevent input from losing focus
        const currentValue = inputElement.value;
        const parts = currentValue.split(",");
        const lastPart = parts.pop(); // Get the part being typed
        const newValue =
          parts.join(",") + (parts.length > 0 ? "," : "") + tag + ", ";
        inputElement.value = newValue;
        autocompleteList.style.display = "none";
        inputElement.focus(); // Keep focus on input
      });
      autocompleteList.appendChild(item);
    });

    autocompleteList.style.display = "block";
  };

  inputElement.addEventListener("input", async () => {
    const currentValue = inputElement.value;
    const parts = currentValue.split(",");
    const currentTag = parts[parts.length - 1].trim().toLowerCase();

    if (currentTag === "") {
      autocompleteList.style.display = "none";
      return;
    }

    // Fetch tags from the provided function
    const allTags = await fetchTags();

    let tagsToSuggest = allTags.filter((tag) =>
      tag.toLowerCase().includes(currentTag)
    );

    // Exclude tags already fully entered in the input
    const existingTags = currentValue
      .split(",")
      .map((t) => t.trim().toLowerCase());
    tagsToSuggest = tagsToSuggest.filter(
      (suggestion) => !existingTags.includes(suggestion.toLowerCase())
    );

    renderSuggestions(tagsToSuggest.slice(0, 10)); // Limit suggestions
  });

  // Hide dropdown when clicking outside
  const clickOutsideHandler = (event) => {
    if (!containerElement.contains(event.target)) {
      autocompleteList.style.display = "none";
    }
  };

  // Use focusout/blur with relatedTarget check to handle clicks inside the list
  inputElement.addEventListener("blur", (event) => {
    // Delay hiding to allow click event on suggestions to fire
    setTimeout(() => {
      if (!autocompleteList.contains(document.activeElement)) {
        autocompleteList.style.display = "none";
      }
    }, 150);
  });
}

/**
 * Show a popup menu for creating annotations
 * @param {Selection} selection - The current text selection
 * @param {{x: number, y: number}} position - The position to show the popup
 * @param {Function} onAnnotate - Called when the user wants to annotate the selection
 */
export function showAnnotationPopup(selection, position, onAnnotate) {
  // Remove any existing popup first
  const existingPopup = document.querySelector(".annotation-popup");
  if (existingPopup) {
    document.body.removeChild(existingPopup);
  }

  // Create a simple popup with initial positioning
  const popup = createAnnotationElement("div", "annotation-popup", {
    position: "absolute",
    left: `${position.x}px`, // Initial position (will be adjusted after measuring)
    top: `${position.y + 5}px`, // Keep slight offset below the selection
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

    // Call the annotation handler
    onAnnotate(selection);
  });

  popup.appendChild(button);
  document.body.appendChild(popup);

  // Now center the popup horizontally by measuring its width and adjusting position
  const halfWidth = popup.offsetWidth / 2;
  popup.style.left = `${position.x - halfWidth}px`;

  // Make sure popup doesn't go off-screen
  const rightEdge = popup.getBoundingClientRect().right;
  const viewportWidth = window.innerWidth;

  // If popup extends beyond right edge of viewport, shift it left
  if (rightEdge > viewportWidth) {
    popup.style.left = `${
      parseInt(popup.style.left) - (rightEdge - viewportWidth + 10)
    }px`;
  }

  // If popup extends beyond left edge of viewport, shift it right
  if (parseFloat(popup.style.left) < 10) {
    popup.style.left = "10px";
  }

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
}

/**
 * Show status indicator for mobile UI feedback
 * @param {string} message - Message to display
 */
export function showStatusIndicator(message) {
  // Remove existing status indicator
  const existingIndicator = document.querySelector(".status-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Create and add status indicator
  const indicator = document.createElement("div");
  indicator.className = "status-indicator";
  indicator.textContent = message;
  document.body.appendChild(indicator);

  // Show and hide with animation
  setTimeout(() => indicator.classList.add("visible"), 10);
  setTimeout(() => {
    indicator.classList.remove("visible");
    setTimeout(() => indicator.remove(), 300);
  }, 2000);
}
