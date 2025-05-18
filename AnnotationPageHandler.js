import {AnnotationViewer} from "./AnnotationViewer.js";

// Maintain state for the annotation view
let annotationViewer;
let currentlyDisplayedAnnotations = [];

// DOM elements - these will be initialized when the view is created
let searchInput, searchBtn, exportBtn, annotationContainer;
let filterButtons, tagFilter, applyTagFilterBtn;

/**
 * Initialize the annotation view within the provided container element
 * @param {HTMLElement} parentElement - The element where the annotation view was injected
 * @param {Function} backCallback - Optional callback to handle "back" button clicks
 */
export async function initializeAnnotationView(parentElement, backCallback) {
  // Initialize AnnotationViewer instance
  annotationViewer = new AnnotationViewer({
    statusCallback: (type, message) => {
      console.log(`[${type}] ${message}`);
      // Display status in a status area if available
      const statusElement = parentElement.querySelector("#status-message");
      if (statusElement) {
        statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
        setTimeout(() => {
          statusElement.innerHTML = "";
        }, 5000);
      }
    },
  });

  // Initialize back button functionality if a callback was provided
  const backLink = parentElement.querySelector(".back-link");
  if (backLink && backCallback) {
    backLink.removeAttribute("href");
    backLink.style.cursor = "pointer";
    backLink.textContent = "← Back to Articles";
    backLink.addEventListener("click", (e) => {
      e.preventDefault();
      backCallback();
    });
  }

  // Query DOM elements from the injected HTML content
  searchInput = parentElement.querySelector("#search-input");
  searchBtn = parentElement.querySelector("#search-btn");
  exportBtn = parentElement.querySelector("#export-btn");
  annotationContainer = parentElement.querySelector("#annotation-container");
  filterButtons = parentElement.querySelectorAll(".filter-button[data-filter]");
  tagFilter = parentElement.querySelector("#tag-filter");
  applyTagFilterBtn = parentElement.querySelector("#apply-tag-filter");

  // Verify that all required elements were found
  if (!annotationContainer || !searchBtn || !exportBtn) {
    console.error("Required elements for annotation view not found");
    parentElement.innerHTML =
      "<p>Error: Could not initialize annotation view. Required elements not found.</p>";
    return;
  }

  // Attach event handlers
  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });

  exportBtn.addEventListener("click", handleExport);
  applyTagFilterBtn.addEventListener("click", handleTagFilter);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all filter buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");
      // Handle the filter selection
      const filter = button.dataset.filter;
      handleFilter(filter);
    });
  });

  // Initialize data
  try {
    await annotationViewer.initialize();
    await loadAllAnnotations();
    await populateTagDropdown();
  } catch (error) {
    console.error("Error loading annotations:", error);
    showError("Failed to load annotations. Please try again.");
  }
}

// Populate the tag dropdown with unique tags from all annotations
async function populateTagDropdown() {
  try {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAllAnnotations();

    // Extract all tags from all annotations
    const allTags = new Set();
    annotations.forEach((annotation) => {
      if (annotation.tags && Array.isArray(annotation.tags)) {
        annotation.tags.forEach((tag) => allTags.add(tag));
      }
    });

    // Sort tags alphabetically
    const sortedTags = Array.from(allTags).sort();

    // Clear existing options except the default one
    while (tagFilter.options.length > 1) {
      tagFilter.remove(1);
    }

    // Add options for each tag
    sortedTags.forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });
  } catch (error) {
    console.error("Error populating tag dropdown:", error);
  }
}

// Handle filtering by tag
async function handleTagFilter() {
  const selectedTag = tagFilter.value;

  if (!selectedTag) {
    // If no tag is selected, show all annotations
    await loadAllAnnotations();
    return;
  }

  try {
    await annotationViewer.initialize();
    const taggedAnnotations = await annotationViewer.searchAnnotationsByTag(
      selectedTag
    );
    renderAnnotations(taggedAnnotations);

    // Update filter button states
    filterButtons.forEach((btn) => btn.classList.remove("active"));
  } catch (error) {
    console.error("Error filtering by tag:", error);
    showError("An error occurred while filtering by tag. Please try again.");
  }
}

// Load and display all annotations
async function loadAllAnnotations() {
  await annotationViewer.initialize();
  const annotations = await annotationViewer.getAllAnnotations();

  // Sort by date (newest first)
  annotations.sort((a, b) => {
    const dateA = new Date(a.dateCreated);
    const dateB = new Date(b.dateCreated);
    return dateB - dateA;
  });

  renderAnnotations(annotations);
}

// Handle search
async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    // If search is empty, show all annotations
    await loadAllAnnotations();
    return;
  }

  try {
    await annotationViewer.initialize();
    const results = await annotationViewer.searchAnnotations(query);
    renderAnnotations(results);
  } catch (error) {
    console.error("Search error:", error);
    showError("An error occurred during search. Please try again.");
  }
}

// Handle filter selection
async function handleFilter(filter) {
  await annotationViewer.initialize();

  if (filter === "all") {
    await loadAllAnnotations();
    return;
  }

  if (filter === "recent") {
    const annotations = await annotationViewer.getAllAnnotations();

    // Sort by date (newest first)
    annotations.sort((a, b) => {
      const dateA = new Date(a.dateCreated);
      const dateB = new Date(b.dateCreated);
      return dateB - dateA;
    });

    // Get annotations from the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentAnnotations = annotations.filter((annotation) => {
      const annotationDate = new Date(annotation.dateCreated);
      return annotationDate >= oneWeekAgo;
    });

    renderAnnotations(recentAnnotations);
  }
}

// Handle export of annotations
async function handleExport() {
  try {
    // Check if there are any annotations to export
    if (currentlyDisplayedAnnotations.length === 0) {
      showError("No annotations currently displayed to export.");
      return;
    }

    // Use the currently displayed annotations
    const data = JSON.stringify(currentlyDisplayedAnnotations, null, 2);
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `annotations-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export error:", error);
    showError("Failed to export annotations. Please try again.");
  }
}

// Render annotations to the container
function renderAnnotations(annotations, customNavigateFunction = null) {
  // Store the currently displayed annotations
  currentlyDisplayedAnnotations = annotations;

  annotationViewer.renderAnnotationsToElement(annotations, annotationContainer);

  // Add click event listeners to annotation items if needed
  const annotationItems =
    annotationContainer.querySelectorAll(".annotation-item");
  annotationItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      // Only handle clicks on the item itself, not on links within it
      if (event.target.closest("a")) {
        return;
      }

      // Get the annotation ID from the data attribute
      const annotationId = item.getAttribute("data-id");
      if (!annotationId) return;

      // Find the annotation in the currently displayed annotations
      const annotation = currentlyDisplayedAnnotations.find(
        (a) => a.id === annotationId
      );
      if (!annotation) return;

      // Get parameters for navigation
      const fileId = annotation.fileId;
      const filePath = annotation.filePath;

      // Create URL with annotation ID as a fragment
      const url = `index.html?file=${encodeURIComponent(
        fileId
      )}&path=${encodeURIComponent(filePath)}#annotation=${annotationId}`;

      // Use custom navigation function if provided (for testing)
      if (customNavigateFunction) {
        customNavigateFunction(url);
      } else {
        // Default navigation
        window.location.href = url;
      }
    });
  });
}

// Show error message
function showError(message) {
  annotationContainer.innerHTML = `
    <div class="empty-state error">
      <p>${message}</p>
      <button id="retry-btn" class="filter-button">Retry</button>
    </div>
  `;

  const retryBtn = annotationContainer.querySelector("#retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", loadAllAnnotations);
  }
}
