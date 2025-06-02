import {AnnotationViewer} from "./AnnotationViewer.js";
import {ZipFileManager} from "./ZipFileManager.js";
import {extractDisplayName} from "./HeadlineExtraction.js";

// Maintain state for the annotation view
let annotationViewer;
let currentlyDisplayedAnnotations = [];
let zipManager;

// DOM elements - these will be initialized when the view is created
let searchInput,
  searchBtn,
  exportBtn,
  exportArticlesBtn,
  annotationContainer,
  articleTopicsBtn;
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

  // Initialize ZipFileManager instance
  zipManager = new ZipFileManager({
    statusCallback: (type, message) => {
      console.log(`[${type}] ${message}`);
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
  exportArticlesBtn = parentElement.querySelector("#export-articles-btn");
  articleTopicsBtn = parentElement.querySelector("#article-topics-btn");
  annotationContainer = parentElement.querySelector("#annotation-container");
  filterButtons = parentElement.querySelectorAll(".filter-button[data-filter]");
  tagFilter = parentElement.querySelector("#tag-filter");
  applyTagFilterBtn = parentElement.querySelector("#apply-tag-filter");

  // Debug: Check if article topics button was found
  console.log("Article topics button found:", articleTopicsBtn);

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
  exportArticlesBtn.addEventListener("click", handleExportArticles);

  // Add debugging for article topics button
  if (articleTopicsBtn) {
    console.log("Adding event listener to article topics button");
    articleTopicsBtn.addEventListener("click", (event) => {
      console.log("Article topics button clicked!");
      event.preventDefault();
      handleShowArticleTopics();
    });
  } else {
    console.error("Article topics button not found in DOM");
  }

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
    await zipManager.initIndexedDB();
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

// Handle export of articles with selected tags
async function handleExportArticles() {
  // Store original button text before any operations
  const originalText = exportArticlesBtn.innerHTML;

  try {
    // Get the currently selected tag from the dropdown
    const selectedTag = tagFilter.value;

    if (!selectedTag) {
      showError("Please select a tag to filter articles for export.");
      return;
    }

    // Update button state
    exportArticlesBtn.disabled = true;
    exportArticlesBtn.innerHTML = "⏳ Preparing export...";

    // Get all ZIP files
    const zipFiles = await zipManager.getAllZipFiles();
    if (zipFiles.length === 0) {
      showError("No collections found. Please import a ZIP file first.");
      return;
    }

    // Use the most recent ZIP file for now
    // In the future, this could be enhanced to allow selection
    const zipData = zipFiles[zipFiles.length - 1];
    const allFilesFromZip = zipData.files;
    const zipName = zipData.name
      ? zipData.name.replace(/\.zip$/i, "")
      : "exported_articles";

    // Get all annotations with the selected tag
    const taggedAnnotations = await annotationViewer.searchAnnotationsByTag(
      selectedTag
    );

    if (taggedAnnotations.length === 0) {
      showError(`No annotations found with the tag "${selectedTag}".`);
      return;
    }

    // Get unique file paths from the annotations
    const annotatedFilePaths = new Set();
    taggedAnnotations.forEach((annotation) => {
      if (annotation.filePath) {
        annotatedFilePaths.add(annotation.filePath);
      }
    });

    // Filter for markdown articles that are in the annotated file paths
    const taggedArticles = allFilesFromZip.filter((file) => {
      const isMarkdown =
        file.path.toLowerCase().endsWith(".md") ||
        file.path.toLowerCase().endsWith(".markdown");
      if (!isMarkdown) {
        return false;
      }
      return annotatedFilePaths.has(file.path);
    });

    if (taggedArticles.length === 0) {
      showError(
        `No articles found that have annotations with the tag "${selectedTag}".`
      );
      return;
    }

    // Create new ZIP using JSZip
    const newZip = new JSZip();
    let articlesAdded = 0;
    const addedImages = new Set(); // Track added images to avoid duplicates

    // Process each tagged article
    for (const articleFile of taggedArticles) {
      try {
        // Add article content
        let articleContent = articleFile.content;
        if (typeof articleContent !== "string") {
          // Convert ArrayBuffer to string if needed
          articleContent = new TextDecoder().decode(articleContent);
        }

        newZip.file(articleFile.path, articleContent);
        articlesAdded++;

        // Find and add images referenced in this article
        const imageRegex = /!\[.*?\]\((.*?)\)/g;
        let match;

        while ((match = imageRegex.exec(articleContent)) !== null) {
          const relativeImageUrl = decodeURIComponent(match[1]);

          // Skip external URLs and data URLs
          if (
            relativeImageUrl.startsWith("http://") ||
            relativeImageUrl.startsWith("https://") ||
            relativeImageUrl.startsWith("data:")
          ) {
            continue;
          }

          try {
            // Resolve relative image path to absolute path within ZIP
            const articleDir = articleFile.path.substring(
              0,
              articleFile.path.lastIndexOf("/") + 1
            );
            const url = new URL(relativeImageUrl, `file:///${articleDir}`);
            let imageAbsolutePath = decodeURIComponent(
              url.pathname.substring(1)
            ); // remove leading '/'
            imageAbsolutePath = imageAbsolutePath.replace(/\\\\/g, "/"); // normalize path separators

            // Skip if already added
            if (addedImages.has(imageAbsolutePath)) {
              continue;
            }

            // Find the image file in the original ZIP
            const imageFile = allFilesFromZip.find((f) => {
              const normalizedFilePath = f.path.replace(/\\\\/g, "/");
              return normalizedFilePath === imageAbsolutePath;
            });

            if (imageFile && imageFile.content) {
              // Determine if this is an image and has valid content
              let isValidImage = false;
              let imageContent = null;

              // Handle both new format (isImage flag) and old format (detect by extension)
              if (
                imageFile.isImage === true &&
                imageFile.content instanceof ArrayBuffer
              ) {
                isValidImage = true;
                imageContent = imageFile.content;
              } else {
                // Check by file extension for older format
                const lowerPath = imageFile.path.toLowerCase();
                const imageExtensions = [
                  ".png",
                  ".jpg",
                  ".jpeg",
                  ".gif",
                  ".svg",
                  ".webp",
                ];
                if (imageExtensions.some((ext) => lowerPath.endsWith(ext))) {
                  isValidImage = true;
                  // Convert string content to ArrayBuffer if needed
                  if (typeof imageFile.content === "string") {
                    const arrayBuffer = new ArrayBuffer(
                      imageFile.content.length
                    );
                    const uint8Array = new Uint8Array(arrayBuffer);
                    for (let i = 0; i < imageFile.content.length; i++) {
                      uint8Array[i] = imageFile.content.charCodeAt(i);
                    }
                    imageContent = arrayBuffer;
                  } else {
                    imageContent = imageFile.content;
                  }
                }
              }

              if (isValidImage && imageContent) {
                newZip.file(imageAbsolutePath, imageContent, {binary: true});
                addedImages.add(imageAbsolutePath);
                console.log(`Added image: ${imageAbsolutePath}`);
              }
            } else {
              console.warn(
                `Image not found in ZIP: ${imageAbsolutePath} referenced by ${articleFile.path}`
              );
            }
          } catch (pathError) {
            console.warn(
              `Error resolving image path "${relativeImageUrl}" in article "${articleFile.path}":`,
              pathError
            );
          }
        }
      } catch (articleError) {
        console.error(
          `Error processing article ${articleFile.path}:`,
          articleError
        );
      }
    }

    if (articlesAdded === 0) {
      showError("No articles could be processed for export.");
      return;
    }

    // Generate and download the ZIP
    const statusElement = exportArticlesBtn
      .closest(".container")
      .querySelector("#status-message");
    if (statusElement) {
      statusElement.innerHTML = `<div class="status info">Generating ZIP file...</div>`;
    }

    const blob = await newZip.generateAsync({type: "blob"});

    // Create download link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${zipName}_${selectedTag}_export.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    const imageCount = addedImages.size;
    if (statusElement) {
      statusElement.innerHTML = `<div class="status success">Exported ${articlesAdded} article(s) and ${imageCount} image(s) with tag "${selectedTag}".</div>`;
      setTimeout(() => {
        statusElement.innerHTML = "";
      }, 5000);
    }
  } catch (error) {
    console.error("Error during export:", error);
    showError(`Export failed: ${error.message}`);
  } finally {
    // Reset button state
    exportArticlesBtn.disabled = false;
    exportArticlesBtn.innerHTML = originalText;
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

// Show article topics popover
async function handleShowArticleTopics() {
  console.log("handleShowArticleTopics called");
  try {
    await annotationViewer.initialize();
    const annotations = await annotationViewer.getAllAnnotations();
    console.log("Found annotations:", annotations.length);

    // Group annotations by article (fileId/filePath)
    const articlesByTopic = new Map();

    annotations.forEach((annotation) => {
      // Get the article identifier (use fileId or filePath)
      const articleId = annotation.fileId || annotation.filePath;
      const articleName =
        extractDisplayName(
          annotation.note || annotation.content || "",
          annotation.filePath
        ) || annotation.filePath;

      // Get tags for this annotation
      if (annotation.tags && Array.isArray(annotation.tags)) {
        annotation.tags.forEach((tag) => {
          if (!articlesByTopic.has(tag)) {
            articlesByTopic.set(tag, new Set());
          }
          articlesByTopic.get(tag).add({
            id: articleId,
            name: articleName,
            path: annotation.filePath,
          });
        });
      }
    });

    console.log("Articles by topic:", articlesByTopic);
    showArticleTopicsPopover(articlesByTopic);
  } catch (error) {
    console.error("Error showing article topics:", error);
    showError("Failed to load article topics. Please try again.");
  }
}

// Display the article topics popover
function showArticleTopicsPopover(articlesByTopic) {
  // Remove existing popover if any
  const existingPopover = document.querySelector(".article-topics-popover");
  if (existingPopover) {
    existingPopover.remove();
  }

  // Create popover element
  const popover = document.createElement("div");
  popover.className = "article-topics-popover";

  let popoverContent = `
    <div class="popover-header">
      <h3>Article Topics</h3>
      <button class="close-btn" onclick="this.closest('.article-topics-popover').remove()">×</button>
    </div>
    <div class="popover-content">
  `;

  if (articlesByTopic.size === 0) {
    popoverContent += '<p class="no-topics">No tagged articles found.</p>';
  } else {
    // Sort topics alphabetically
    const sortedTopics = Array.from(articlesByTopic.keys()).sort();

    sortedTopics.forEach((topic) => {
      const articles = Array.from(articlesByTopic.get(topic));
      popoverContent += `
        <div class="topic-section">
          <h4 class="topic-title">${topic}</h4>
          <ul class="article-list">
      `;

      // Sort articles by name
      articles.sort((a, b) => a.name.localeCompare(b.name));

      articles.forEach((article) => {
        popoverContent += `
          <li class="article-item">
            <a href="?file=${encodeURIComponent(
              article.id
            )}&path=${encodeURIComponent(
          article.path
        )}" class="article-link" title="${article.path}">
              ${article.name}
            </a>
          </li>
        `;
      });

      popoverContent += `
          </ul>
        </div>
      `;
    });
  }

  popoverContent += `
    </div>
  `;

  popover.innerHTML = popoverContent;

  // Add popover to the document
  document.body.appendChild(popover);

  // Position the popover near the button
  const buttonRect = articleTopicsBtn.getBoundingClientRect();
  popover.style.position = "fixed";
  popover.style.top = buttonRect.bottom + 10 + "px";
  popover.style.right = window.innerWidth - buttonRect.right + "px";

  // Add click outside to close
  setTimeout(() => {
    document.addEventListener("click", function closePopover(e) {
      if (!popover.contains(e.target) && e.target !== articleTopicsBtn) {
        popover.remove();
        document.removeEventListener("click", closePopover);
      }
    });
  }, 100);
}
