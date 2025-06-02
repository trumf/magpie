export class ContentManager {
  constructor(eventBus, contentElement) {
    this.eventBus = eventBus;
    this.content = contentElement;
    this.currentFile = null;
    this.articleNavigator = null;
    this.currentZipFiles = [];

    this.init();
  }

  init() {
    this.bindEvents();
    this.showEmptyState();
  }

  bindEvents() {
    // Listen for file selection
    this.eventBus.on("file:selected", (data) => {
      this.displayMarkdownFile(data.file);
    });

    // Listen for view mode changes
    this.eventBus.on("view:changed", (data) => {
      this.handleViewModeChange(data.mode);
    });

    // Listen for navigation events
    this.eventBus.on("navigation:prev", () => this.navigatePrevious());
    this.eventBus.on("navigation:next", () => this.navigateNext());
  }

  showEmptyState() {
    this.content.innerHTML = `
      <div class="empty-state">
        <p>No markdown file selected</p>
        <p>Import a ZIP file and select a markdown file to view</p>
      </div>
    `;
  }

  setCurrentZipFiles(files) {
    this.currentZipFiles = files;
  }

  async displayMarkdownFile(file, isSwipeNavigation = false) {
    this.currentFile = file;

    // Clear URL hash when navigating via swipe to ensure proper scroll behavior
    if (isSwipeNavigation && window.location.hash) {
      history.replaceState(
        null,
        null,
        window.location.pathname + window.location.search
      );
    }

    try {
      // Import the markdown rendering module (corrected path)
      const {renderMarkdownToElement} = await import(
        "../../MarkdownRendering.js"
      );

      // Use the current ZIP files from the app state
      const currentZipFiles = this.currentZipFiles;

      // Render markdown
      renderMarkdownToElement(
        file.content,
        this.content,
        true,
        currentZipFiles,
        file.path
      );

      // Add article note button
      this.addArticleNoteButton();

      // Set up navigation
      this.setupNavigation();

      // Initialize annotation system
      this.initializeAnnotations(file);

      // Handle scrolling
      this.handleScrolling(isSwipeNavigation);

      // Mark file as read
      this.eventBus.emit("file:mark-read", {file});
    } catch (error) {
      console.error("Error displaying markdown file:", error);
      this.showError(`Error displaying file: ${error.message}`);
    }
  }

  addArticleNoteButton() {
    const articleNoteContainer = document.createElement("div");
    articleNoteContainer.style.padding = "10px 0";
    articleNoteContainer.style.borderBottom = "1px solid #eee";
    articleNoteContainer.style.marginBottom = "15px";

    const articleNoteButton = document.createElement("button");
    articleNoteButton.textContent = "🗂️ Add Article Note";
    articleNoteButton.style.fontSize = "0.9em";
    articleNoteButton.onclick = () => {
      this.eventBus.emit("annotation:create-article-note", {
        file: this.currentFile,
      });
    };

    articleNoteContainer.appendChild(articleNoteButton);
    this.content.prepend(articleNoteContainer);
  }

  setupNavigation() {
    // Remove any existing navigation buttons
    const existingNav = this.content.querySelector(".article-navigation");
    if (existingNav) {
      existingNav.remove();
    }

    // Add navigation buttons if we have an article navigator
    if (this.articleNavigator) {
      this.articleNavigator.createNavigationButtons(this.content, (article) => {
        this.eventBus.emit("navigation:article-selected", {article});
        this.displayMarkdownFile(article, true);
      });
    }
  }

  async initializeAnnotations(file) {
    try {
      // Import annotation system (corrected path)
      const {AnnotationSystem} = await import("../../MarkdownAnnotation.js");

      // Initialize annotation system with a small delay
      setTimeout(() => {
        AnnotationSystem.initialize(
          this.content,
          file.zipId || "unknown", // TODO: Pass actual ZIP ID
          file.path
        );

        // Fade back in after rendering and annotation init
        this.content.style.opacity = "1";
      }, 100);
    } catch (error) {
      console.error("Error initializing annotations:", error);
    }
  }

  handleScrolling(isSwipeNavigation) {
    setTimeout(() => {
      if (isSwipeNavigation) {
        // For swipe navigation, always scroll to top
        this.scrollToTop();
      } else {
        // For regular navigation, check for annotation ID in URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const annotationId = hashParams.get("annotation");

        if (annotationId) {
          // Try to scroll to annotation after a delay for highlights to be created
          setTimeout(() => {
            this.eventBus.emit("annotation:scroll-to", {id: annotationId});
          }, 300);
        } else {
          this.scrollToTop();
        }
      }
    }, 50);
  }

  scrollToTop() {
    window.scrollTo(0, 0);
    if (this.content.scrollTop !== undefined) {
      this.content.scrollTop = 0;
    }
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  async handleViewModeChange(mode) {
    if (mode === "annotations") {
      await this.showAnnotationsView();
    } else {
      this.showArticlesView();
    }
  }

  async showAnnotationsView() {
    try {
      // Show loading state
      this.content.innerHTML =
        "<div class='empty-state'><p>Loading annotations view...</p></div>";

      // Fetch the annotation page HTML
      const response = await fetch("AnnotationPage.html");
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const container = doc.querySelector(".container");

      if (container) {
        // Create wrapper for annotation content
        const wrapper = document.createElement("div");
        wrapper.className = "annotation-view-wrapper";
        wrapper.innerHTML = container.innerHTML;

        // Replace content
        this.content.innerHTML = "";
        this.content.appendChild(wrapper);

        // Initialize annotation view (corrected path)
        const {initializeAnnotationView} = await import(
          "../../AnnotationPageHandler.js"
        );
        await initializeAnnotationView(wrapper, () => {
          this.eventBus.emit("view:change-to-articles");
        });
      } else {
        this.showError("Error loading annotations view.");
      }
    } catch (error) {
      console.error("Error showing annotations view:", error);
      this.showError(`Error: ${error.message}`);
    }
  }

  showArticlesView() {
    // Restore the article content or show empty state
    if (this.currentFile) {
      this.displayMarkdownFile(this.currentFile);
    } else {
      this.showEmptyState();
    }
  }

  showError(message) {
    this.content.innerHTML = `<div class='empty-state'><p>Error: ${message}</p></div>`;
  }

  setArticleNavigator(navigator) {
    this.articleNavigator = navigator;
  }

  navigatePrevious() {
    if (this.articleNavigator) {
      const prevArticle = this.articleNavigator.getPreviousArticle();
      if (prevArticle) {
        this.eventBus.emit("navigation:article-selected", {
          article: prevArticle,
        });
        this.displayMarkdownFile(prevArticle, true);
      }
    }
  }

  navigateNext() {
    if (this.articleNavigator) {
      const nextArticle = this.articleNavigator.getNextArticle();
      if (nextArticle) {
        this.eventBus.emit("navigation:article-selected", {
          article: nextArticle,
        });
        this.displayMarkdownFile(nextArticle, true);
      }
    }
  }

  updateSidebarSelection(article) {
    this.eventBus.emit("sidebar:update-selection", {article});
  }
}
