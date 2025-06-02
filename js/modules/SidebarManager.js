export class SidebarManager {
  constructor(eventBus, sidebarElement) {
    this.eventBus = eventBus;
    this.sidebar = sidebarElement;
    this.isOpen = false;
    this.viewMode = "articles";
    this.selectedTags = [];
    this.allUniqueTags = [];

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSavedPreferences();
  }

  bindEvents() {
    // File upload
    const zipFileInput = this.sidebar.querySelector("#zip-file-input");
    if (zipFileInput) {
      zipFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.eventBus.emit("file:upload", file);
          zipFileInput.value = ""; // Reset input
        }
      });
    }

    // Collections toggle
    const collectionsToggle = this.sidebar.querySelector("#collections-toggle");
    if (collectionsToggle) {
      collectionsToggle.addEventListener("click", () => {
        this.toggleCollections();
      });
    }

    // View mode buttons
    const viewArticlesBtn = this.sidebar.querySelector("#view-articles-btn");
    const viewAnnotationsBtn = this.sidebar.querySelector(
      "#view-annotations-btn"
    );

    if (viewArticlesBtn) {
      viewArticlesBtn.addEventListener("click", () =>
        this.setViewMode("articles")
      );
    }
    if (viewAnnotationsBtn) {
      viewAnnotationsBtn.addEventListener("click", () =>
        this.setViewMode("annotations")
      );
    }

    // Sort pills
    const sortPills = this.sidebar.querySelectorAll(".sort-pill");
    sortPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const sortValue = pill.getAttribute("data-sort");
        this.setSortMethod(sortValue);
      });
    });

    // Tag dropdown
    const tagDropdownBtn = this.sidebar.querySelector("#tag-dropdown-btn");
    const tagDropdownList = this.sidebar.querySelector("#tag-dropdown-list");

    if (tagDropdownBtn && tagDropdownList) {
      tagDropdownBtn.addEventListener("click", () => this.toggleTagDropdown());

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !tagDropdownBtn.contains(e.target) &&
          !tagDropdownList.contains(e.target)
        ) {
          this.closeTagDropdown();
        }
      });
    }

    // Clear tags button
    const clearTagsBtn = this.sidebar.querySelector("#clear-tags-btn");
    if (clearTagsBtn) {
      clearTagsBtn.addEventListener("click", () => this.clearSelectedTags());
    }

    // Listen for external events
    this.eventBus.on("files:loaded", (data) => this.updateFileList(data.files));
    this.eventBus.on("tags:updated", (tags) => this.updateTags(tags));
    this.eventBus.on("collections:updated", (collections) =>
      this.updateCollections(collections)
    );
  }

  loadSavedPreferences() {
    // Load collections collapsed state
    const savedCollapsedState = localStorage.getItem("collections_collapsed");
    if (savedCollapsedState === "true") {
      const toggle = this.sidebar.querySelector("#collections-toggle");
      const container = this.sidebar.querySelector(
        "#collection-list-container"
      );
      if (toggle && container) {
        toggle.classList.add("collapsed");
        container.classList.add("collapsed");
      }
    }

    // Load sort preference
    const savedSortMethod =
      localStorage.getItem("md_file_sort_order") || "recency";
    this.setSortMethod(savedSortMethod);
  }

  toggleCollections() {
    const toggle = this.sidebar.querySelector("#collections-toggle");
    const container = this.sidebar.querySelector("#collection-list-container");

    if (toggle && container) {
      toggle.classList.toggle("collapsed");
      container.classList.toggle("collapsed");

      const isCollapsed = toggle.classList.contains("collapsed");
      localStorage.setItem("collections_collapsed", isCollapsed);
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;

    // Update UI
    const articlesBtn = this.sidebar.querySelector("#view-articles-btn");
    const annotationsBtn = this.sidebar.querySelector("#view-annotations-btn");
    const annotationsSortPill = this.sidebar.querySelector(
      "#annotations-sort-pill"
    );

    if (articlesBtn)
      articlesBtn.classList.toggle("active", mode === "articles");
    if (annotationsBtn)
      annotationsBtn.classList.toggle("active", mode === "annotations");
    if (annotationsSortPill) {
      annotationsSortPill.style.display =
        mode === "annotations" ? "inline-block" : "none";
    }

    this.eventBus.emit("view:changed", {mode});
  }

  setSortMethod(method) {
    // Update UI - highlight the active sort pill
    const sortPills = this.sidebar.querySelectorAll(".sort-pill");
    sortPills.forEach((pill) => {
      pill.classList.toggle(
        "active",
        pill.getAttribute("data-sort") === method
      );
    });

    // Save preference
    localStorage.setItem("md_file_sort_order", method);

    this.eventBus.emit("sort:changed", {method});
  }

  toggleTagDropdown() {
    const tagDropdownList = this.sidebar.querySelector("#tag-dropdown-list");
    if (tagDropdownList) {
      const isOpen = tagDropdownList.style.display === "block";
      tagDropdownList.style.display = isOpen ? "none" : "block";

      const dropdownArrow = this.sidebar.querySelector(".dropdown-arrow");
      if (dropdownArrow) {
        dropdownArrow.classList.toggle("open", !isOpen);
      }
    }
  }

  closeTagDropdown() {
    const tagDropdownList = this.sidebar.querySelector("#tag-dropdown-list");
    const dropdownArrow = this.sidebar.querySelector(".dropdown-arrow");

    if (tagDropdownList) tagDropdownList.style.display = "none";
    if (dropdownArrow) dropdownArrow.classList.remove("open");
  }

  handleTagSelection(tag, toggle = false) {
    if (toggle) {
      if (this.selectedTags.includes(tag)) {
        this.selectedTags = this.selectedTags.filter((t) => t !== tag);
      } else {
        this.selectedTags.push(tag);
      }
    } else {
      this.selectedTags = tag ? [tag] : [];
    }

    this.updateTagUI();
    this.closeTagDropdown();
    this.eventBus.emit("tags:filter-changed", {
      selectedTags: this.selectedTags,
    });
  }

  clearSelectedTags() {
    this.selectedTags = [];
    this.updateTagUI();
    this.eventBus.emit("tags:filter-changed", {
      selectedTags: this.selectedTags,
    });
  }

  updateTagUI() {
    const tagDropdownText = this.sidebar.querySelector("#tag-dropdown-text");
    const clearTagsBtn = this.sidebar.querySelector("#clear-tags-btn");
    const selectedTagsContainer = this.sidebar.querySelector(
      "#selected-tags-container"
    );

    // Update dropdown text
    if (tagDropdownText) {
      tagDropdownText.textContent =
        this.selectedTags.length > 0
          ? `${this.selectedTags.length} tag${
              this.selectedTags.length !== 1 ? "s" : ""
            } selected`
          : "Select a tag";
    }

    // Show/hide clear button
    if (clearTagsBtn) {
      clearTagsBtn.style.display =
        this.selectedTags.length > 0 ? "block" : "none";
    }

    // Render selected tags as pills
    if (selectedTagsContainer) {
      selectedTagsContainer.innerHTML = "";
      this.selectedTags.forEach((tag) => {
        const tagPill = document.createElement("span");
        tagPill.className = "tag-pill";

        const tagText = document.createTextNode(tag);
        tagPill.appendChild(tagText);

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-tag";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", () =>
          this.handleTagSelection(tag, true)
        );
        tagPill.appendChild(removeBtn);

        selectedTagsContainer.appendChild(tagPill);
      });
    }
  }

  updateTags(tags) {
    this.allUniqueTags = tags;
    this.populateTagDropdown();
  }

  populateTagDropdown() {
    const tagDropdownList = this.sidebar.querySelector("#tag-dropdown-list");
    if (!tagDropdownList) return;

    // Clear existing tags, but keep the "All Tags" option
    tagDropdownList.innerHTML = "";

    // Add "All Tags" option
    const allTagsOption = document.createElement("div");
    allTagsOption.className = "tag-option";
    allTagsOption.setAttribute("data-tag", "");
    allTagsOption.textContent = "All Tags";
    allTagsOption.addEventListener("click", () => this.handleTagSelection(""));
    tagDropdownList.appendChild(allTagsOption);

    // Add individual tags
    this.allUniqueTags.forEach((tag) => {
      const tagOption = document.createElement("div");
      tagOption.className = "tag-option";
      if (this.selectedTags.includes(tag)) {
        tagOption.classList.add("selected");
      }
      tagOption.setAttribute("data-tag", tag);
      tagOption.textContent = tag;
      tagOption.addEventListener("click", () => this.handleTagSelection(tag));
      tagDropdownList.appendChild(tagOption);
    });
  }

  updateFileList(files) {
    const fileListElement = this.sidebar.querySelector("#file-list");
    if (!fileListElement) return;

    // Clear previous file list
    fileListElement.innerHTML = "";

    if (files.length === 0) {
      const emptyElement = document.createElement("div");
      emptyElement.className = "empty-state";
      emptyElement.innerHTML = `
        <p>No ZIP files imported</p>
        <p>Use the Import ZIP button above to get started</p>
      `;
      fileListElement.appendChild(emptyElement);
      return;
    }

    // Create file items
    files.forEach((file) => {
      const fileItem = this.createFileItem(file);
      fileListElement.appendChild(fileItem);
    });
  }

  createFileItem(file) {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item md-file";

    // Add read/unread class
    if (file.isRead) {
      fileItem.classList.add("read");
    } else {
      fileItem.classList.add("unread");
    }

    // File title
    const fileTitle = document.createElement("div");
    fileTitle.className = "file-title";
    fileTitle.textContent = file.displayName || file.path;
    fileItem.appendChild(fileTitle);

    // Tags
    if (file.tags && Array.isArray(file.tags) && file.tags.length > 0) {
      const tagsContainer = document.createElement("div");
      tagsContainer.className = "file-item-tags";

      const displayTags = file.tags.slice(0, 3);
      displayTags.forEach((tag) => {
        const tagElement = document.createElement("span");
        tagElement.className = "file-item-tag";
        if (this.selectedTags.includes(tag)) {
          tagElement.classList.add("active");
        }
        tagElement.textContent = tag;
        tagElement.addEventListener("click", (e) => {
          e.stopPropagation();
          this.handleTagSelection(tag, true);
        });
        tagsContainer.appendChild(tagElement);
      });

      if (file.tags.length > 3) {
        const moreIndicator = document.createElement("span");
        moreIndicator.className = "file-item-more-tags";
        moreIndicator.textContent = `+${file.tags.length - 3}`;
        tagsContainer.appendChild(moreIndicator);
      }

      fileItem.appendChild(tagsContainer);
    }

    // Annotation count for annotation view
    if (
      this.viewMode === "annotations" &&
      typeof file.annotations === "number" &&
      file.annotations > 0
    ) {
      const annotCount = document.createElement("span");
      annotCount.className = "annotation-count";
      annotCount.textContent = file.annotations;
      fileItem.appendChild(annotCount);
    }

    fileItem.dataset.path = file.path;

    // Event handlers
    fileItem.addEventListener("click", () => {
      this.selectFile(fileItem, file);
    });

    fileItem.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.eventBus.emit("file:toggle-read", {file});
    });

    return fileItem;
  }

  selectFile(fileItem, file) {
    // Remove active class from all items
    this.sidebar.querySelectorAll(".file-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Add active class to clicked item
    fileItem.classList.add("active");

    this.eventBus.emit("file:selected", {file});
  }

  updateCollections(collections) {
    const collectionList = this.sidebar.querySelector("#collection-list");
    if (!collectionList) return;

    collectionList.innerHTML = "";

    if (collections.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty";
      emptyItem.textContent = "No collections yet";
      collectionList.appendChild(emptyItem);
      return;
    }

    collections.forEach((collection) => {
      const listItem = document.createElement("li");
      listItem.className = "collection-item";
      listItem.textContent = collection.name;
      listItem.addEventListener("click", () => {
        this.eventBus.emit("collection:selected", {collection});
      });
      collectionList.appendChild(listItem);
    });
  }

  updateFileItemReadStatus(filePath, isRead) {
    const fileItem = this.sidebar.querySelector(
      `.file-item[data-path="${filePath}"]`
    );
    if (fileItem) {
      if (isRead) {
        fileItem.classList.add("read");
        fileItem.classList.remove("unread");
      } else {
        fileItem.classList.add("unread");
        fileItem.classList.remove("read");
      }
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.sidebar.classList.toggle("open", this.isOpen);

    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.classList.toggle("active", this.isOpen);
    }
  }

  close() {
    this.isOpen = false;
    this.sidebar.classList.remove("open");

    const overlay = document.getElementById("overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  }
}
