import {EventBus} from "./utils/EventBus.js";
import {SidebarManager} from "./modules/SidebarManager.js";
import {ContentManager} from "./modules/ContentManager.js";
import {ZipFileManager} from "../ZipFileManager.js";
import {ArticleNavigationHelper} from "../ArticleNavigation.js";
import {setupSwipeNavigation} from "../SwipeNavigation.js";
import {refreshCollections, selectCollection} from "../CollectionsManager.js";

export class App {
  constructor() {
    this.eventBus = new EventBus();
    this.zipManager = null;
    this.sidebarManager = null;
    this.contentManager = null;
    this.articleNavigator = null;

    // Application state
    this.currentZipId = null;
    this.currentZipFiles = [];
    this.selectedFile = null;
    this.viewMode = "articles";
    this.selectedTags = [];
    this.allUniqueTags = [];

    this.init();
  }

  async init() {
    try {
      await this.initializeManagers();
      this.bindGlobalEvents();
      await this.loadInitialData();
      this.setupInitialState();
    } catch (error) {
      console.error("Error initializing app:", error);
      this.showError(`Initialization failed: ${error.message}`);
    }
  }

  async initializeManagers() {
    // Initialize ZIP file manager
    this.zipManager = new ZipFileManager({
      statusCallback: (type, message) => {
        this.showStatus(type, message);
      },
    });
    await this.zipManager.initIndexedDB();

    // Initialize UI managers
    const sidebarElement = document.getElementById("sidebar");
    const contentElement = document.getElementById("markdown-content");

    if (!sidebarElement || !contentElement) {
      throw new Error("Required DOM elements not found");
    }

    this.sidebarManager = new SidebarManager(this.eventBus, sidebarElement);
    this.contentManager = new ContentManager(this.eventBus, contentElement);
  }

  bindGlobalEvents() {
    // File operations
    this.eventBus.on("file:upload", (file) => this.handleFileUpload(file));
    this.eventBus.on("file:selected", (data) =>
      this.handleFileSelected(data.file)
    );
    this.eventBus.on("file:toggle-read", (data) =>
      this.handleToggleReadStatus(data.file)
    );
    this.eventBus.on("file:mark-read", (data) =>
      this.handleMarkAsRead(data.file)
    );

    // View and filtering
    this.eventBus.on("view:changed", (data) =>
      this.handleViewModeChange(data.mode)
    );
    this.eventBus.on("view:change-to-articles", () =>
      this.handleViewModeChange("articles")
    );
    this.eventBus.on("sort:changed", (data) =>
      this.handleSortChange(data.method)
    );
    this.eventBus.on("tags:filter-changed", (data) =>
      this.handleTagFilterChange(data.selectedTags)
    );

    // Collections
    this.eventBus.on("collection:selected", (data) =>
      this.handleCollectionSelected(data.collection)
    );

    // Navigation
    this.eventBus.on("navigation:article-selected", (data) =>
      this.handleArticleNavigated(data.article)
    );
    this.eventBus.on("sidebar:update-selection", (data) =>
      this.updateSidebarSelection(data.article)
    );

    // Annotations
    this.eventBus.on("annotation:create-article-note", (data) =>
      this.handleCreateArticleNote(data.file)
    );
    this.eventBus.on("annotation:scroll-to", (data) =>
      this.handleScrollToAnnotation(data.id)
    );

    // Global menu toggle
    window.toggleMenu = () => this.toggleMenu();
  }

  async loadInitialData() {
    // Get all existing ZIP files
    const zipFiles = await this.zipManager.getAllZipFiles();

    // Check for URL parameters
    const hasUrlParams = this.checkUrlParameters();

    if (hasUrlParams) {
      await this.openFileFromUrlParams();
    } else if (zipFiles.length > 0) {
      // Load most recent ZIP file
      const mostRecent = zipFiles[zipFiles.length - 1];
      this.currentZipId = mostRecent.id;
      await this.displayZipContents(mostRecent);
    }

    // Refresh collections
    await this.refreshCollections();
  }

  setupInitialState() {
    // Setup mobile menu toggle for initial load
    if (!this.checkUrlParameters() && window.innerWidth <= 768) {
      const sidebar = document.getElementById("sidebar");
      if (sidebar && !sidebar.classList.contains("open")) {
        this.toggleMenu();
      }
    }
  }

  async handleFileUpload(file) {
    try {
      this.currentZipId = await this.zipManager.saveZipFile(file);
      const zipData = await this.zipManager.getZipFileById(this.currentZipId);
      await this.displayZipContents(zipData);
      await this.refreshCollections();
    } catch (error) {
      console.error("Error uploading ZIP file:", error);
      this.showStatus("error", `Error: ${error.message}`);
    }
  }

  async handleFileSelected(file) {
    this.selectedFile = file;

    // Update the file with current ZIP files for rendering
    file.zipId = this.currentZipId;

    // The ContentManager will handle the actual display
    // We just need to ensure we have the current context
  }

  async handleToggleReadStatus(file) {
    try {
      const isRead = await this.zipManager.toggleReadState(
        this.currentZipId,
        file.path
      );
      this.sidebarManager.updateFileItemReadStatus(file.path, isRead);
    } catch (error) {
      console.error("Error toggling read status:", error);
    }
  }

  async handleMarkAsRead(file) {
    try {
      await this.zipManager.markFileAsRead(this.currentZipId, file.path);
      this.sidebarManager.updateFileItemReadStatus(file.path, true);
    } catch (error) {
      console.error("Error marking file as read:", error);
    }
  }

  async handleViewModeChange(mode) {
    this.viewMode = mode;

    if (mode === "articles" && this.currentZipId) {
      // Refresh file list for articles view
      const zipData = await this.zipManager.getZipFileById(this.currentZipId);
      await this.displayZipContents(zipData);
    }
  }

  async handleSortChange(method) {
    if (this.currentZipId) {
      const zipData = await this.zipManager.getZipFileById(this.currentZipId);
      await this.displayZipContents(zipData);
    }
  }

  async handleTagFilterChange(selectedTags) {
    this.selectedTags = selectedTags;

    if (this.currentZipId) {
      const zipData = await this.zipManager.getZipFileById(this.currentZipId);
      await this.displayZipContents(zipData);
    }
  }

  async handleCollectionSelected(collection) {
    try {
      this.currentZipId = collection.id;
      const zipData = await this.zipManager.getZipFileById(collection.id);
      await this.displayZipContents(zipData);
    } catch (error) {
      console.error("Error selecting collection:", error);
      this.showStatus("error", `Error loading collection: ${error.message}`);
    }
  }

  handleArticleNavigated(article) {
    this.updateSidebarSelection(article);
  }

  updateSidebarSelection(article) {
    // Find and highlight the article in the sidebar
    const fileItem = document.querySelector(
      `.file-item[data-path="${article.path}"]`
    );
    if (fileItem) {
      document.querySelectorAll(".file-item").forEach((item) => {
        item.classList.remove("active");
      });
      fileItem.classList.add("active");
      fileItem.scrollIntoView({block: "nearest"});
    }
  }

  handleCreateArticleNote(file) {
    // TODO: Implement article note creation
    console.log("Creating article note for:", file);
    alert("Article note functionality will be implemented soon.");
  }

  handleScrollToAnnotation(annotationId) {
    // TODO: Implement scroll to annotation
    console.log("Scrolling to annotation:", annotationId);
  }

  async displayZipContents(zipData) {
    this.currentZipFiles = zipData.files;

    // Filter for markdown files
    const mdFiles = zipData.files.filter((file) => {
      const lowerPath = file.path.toLowerCase();
      return lowerPath.endsWith(".md") || lowerPath.endsWith(".markdown");
    });

    // Extract and update tags
    this.allUniqueTags = this.extractUniqueTags(mdFiles);
    this.eventBus.emit("tags:updated", this.allUniqueTags);

    // Apply filtering and sorting
    let filteredFiles = this.applyFilters(mdFiles);
    filteredFiles = this.applySorting(filteredFiles);

    // Update article navigator
    this.articleNavigator = new ArticleNavigationHelper(filteredFiles);
    this.contentManager.setArticleNavigator(this.articleNavigator);

    // Setup swipe navigation
    this.setupSwipeNavigation();

    // Update sidebar with filtered files
    this.eventBus.emit("files:loaded", {files: filteredFiles});
  }

  extractUniqueTags(files) {
    const allTags = new Set();

    // Add ZIP name as a tag if available
    if (this.currentZipId && this.zipManager.getZipNameById) {
      const zipNameTag = this.zipManager.getZipNameById(this.currentZipId);
      if (
        zipNameTag &&
        typeof zipNameTag === "string" &&
        zipNameTag.trim() !== ""
      ) {
        const cleanZipName = zipNameTag
          .replace(/\.zip$/i, "")
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase();
        if (cleanZipName.trim() !== "") {
          allTags.add(cleanZipName);
        }
      }
    }

    // Extract tags from files
    files.forEach((file) => {
      if (file.tags && Array.isArray(file.tags)) {
        file.tags.forEach((tag) => {
          if (tag && typeof tag === "string" && tag.trim() !== "") {
            allTags.add(tag.trim());
          }
        });
      }
    });

    return [...allTags].sort();
  }

  applyFilters(files) {
    let filtered = files;

    // Apply tag filtering
    if (this.selectedTags.length > 0) {
      filtered = filtered.filter((file) => {
        if (!file.tags || !Array.isArray(file.tags)) {
          return false;
        }
        return this.selectedTags.every((tag) => file.tags.includes(tag));
      });
    }

    // Apply view mode filtering
    if (this.viewMode === "annotations") {
      filtered = filtered.filter((file) => {
        return typeof file.annotations === "number"
          ? file.annotations > 0
          : true;
      });
    }

    return filtered;
  }

  applySorting(files) {
    const activePill = document.querySelector(".sort-pill.active");
    const sortMethod = activePill?.getAttribute("data-sort") || "recency";

    if (this.viewMode === "annotations" && sortMethod === "annotations") {
      return files.sort((a, b) => {
        const aCount = typeof a.annotations === "number" ? a.annotations : 0;
        const bCount = typeof b.annotations === "number" ? b.annotations : 0;
        return bCount - aCount;
      });
    }

    return this.zipManager.sortFilesByReadStatus(files, sortMethod);
  }

  setupSwipeNavigation() {
    const contentElement = document.getElementById("markdown-content");
    if (contentElement && this.articleNavigator) {
      setupSwipeNavigation(
        contentElement,
        this.articleNavigator,
        (file) => this.eventBus.emit("file:selected", {file}),
        (article) => this.updateSidebarSelection(article)
      );
    }
  }

  async refreshCollections() {
    try {
      const collectionList = document.getElementById("collection-list");
      if (collectionList) {
        await refreshCollections(
          this.zipManager,
          collectionList,
          this.currentZipId,
          document.getElementById("markdown-content"),
          (zipData) => this.displayZipContents(zipData)
        );
      }
    } catch (error) {
      console.error("Error refreshing collections:", error);
    }
  }

  checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    return params.has("file") && params.has("path");
  }

  async openFileFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const fileId = params.get("file");
    const filePath = params.get("path");

    if (fileId && filePath) {
      try {
        this.currentZipId = parseInt(fileId, 10);
        if (isNaN(this.currentZipId)) {
          this.currentZipId = fileId;
        }

        const zipData = await this.zipManager.getZipFileById(this.currentZipId);
        await this.displayZipContents(zipData);

        const targetFile = zipData.files.find((file) => file.path === filePath);
        if (targetFile) {
          this.eventBus.emit("file:selected", {file: targetFile});
          this.showStatus("success", `Opened file: ${filePath}`);
        } else {
          this.showStatus("error", `File not found: ${filePath}`);
        }
      } catch (error) {
        console.error("Error opening file from URL:", error);
        this.showStatus("error", `Error opening file: ${error.message}`);
      }
    }
  }

  toggleMenu() {
    if (this.sidebarManager) {
      this.sidebarManager.toggle();
    }
  }

  showStatus(type, message) {
    const statusElement = document.getElementById("status-message");
    if (statusElement) {
      statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
      setTimeout(() => {
        statusElement.innerHTML = "";
      }, 5000);
    }
  }

  showError(message) {
    console.error("App Error:", message);
    this.showStatus("error", message);
  }
}
