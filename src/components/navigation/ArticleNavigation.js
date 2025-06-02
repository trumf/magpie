/**
 * ArticleNavigation.js
 *
 * Provides navigation between articles in the MarkdownZipViewer
 */

/**
 * Helper class for navigating between markdown articles
 */
export class ArticleNavigationHelper {
  /**
   * Create a new ArticleNavigationHelper
   * @param {Array} files - Array of file objects to navigate through
   */
  constructor(files) {
    this.files = files || [];
    this.currentIndex = 0;
  }

  /**
   * Get the next article in the list
   * @returns {Object|null} The next article or null if at the end
   */
  getNextArticle() {
    if (this.currentIndex < this.files.length - 1) {
      return this.files[this.currentIndex + 1];
    }
    return null;
  }

  /**
   * Get the previous article in the list
   * @returns {Object|null} The previous article or null if at the beginning
   */
  getPreviousArticle() {
    if (this.currentIndex > 0) {
      return this.files[this.currentIndex - 1];
    }
    return null;
  }

  /**
   * Navigate to a specific article by its index
   * @param {number} index - The index to navigate to
   * @returns {Object|null} The article at that index or null if invalid
   */
  navigateToIndex(index) {
    if (index >= 0 && index < this.files.length) {
      this.currentIndex = index;
      return this.files[index];
    }
    return null;
  }

  /**
   * Find the index of an article by its path
   * @param {string} path - The path of the article to find
   * @returns {number} The index of the article or -1 if not found
   */
  findArticleIndex(path) {
    return this.files.findIndex((file) => file.path === path);
  }

  /**
   * Set the current article based on its path
   * @param {string} path - The path of the article to set as current
   * @returns {boolean} True if the article was found and set as current
   */
  setCurrentArticle(path) {
    const index = this.findArticleIndex(path);
    if (index !== -1) {
      this.currentIndex = index;
      return true;
    }
    return false;
  }

  /**
   * Check if there is a next article available
   * @returns {boolean} True if there is a next article
   */
  hasNextArticle() {
    return this.currentIndex < this.files.length - 1;
  }

  /**
   * Check if there is a previous article available
   * @returns {boolean} True if there is a previous article
   */
  hasPreviousArticle() {
    return this.currentIndex > 0;
  }

  /**
   * Move to the next article
   * @returns {Object|null} The next article or null if at the end
   */
  moveToNextArticle() {
    if (this.hasNextArticle()) {
      this.currentIndex++;
      return this.files[this.currentIndex];
    }
    return null;
  }

  /**
   * Move to the previous article
   * @returns {Object|null} The previous article or null if at the beginning
   */
  moveToPreviousArticle() {
    if (this.hasPreviousArticle()) {
      this.currentIndex--;
      return this.files[this.currentIndex];
    }
    return null;
  }

  /**
   * Create navigation buttons for an article
   * @param {HTMLElement} container - The container to add the buttons to
   * @param {Function} onNavigate - Callback when navigation occurs
   * @returns {HTMLElement} The navigation container element
   */
  createNavigationButtons(container, onNavigate) {
    // Create navigation container
    const navContainer = document.createElement("div");
    navContainer.className = "article-navigation";
    navContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    `;

    // Create previous button
    const prevButton = document.createElement("button");
    prevButton.className = "nav-button prev-button";
    prevButton.innerHTML = "← Previous Article";
    prevButton.style.cssText = `
      padding: 10px 15px;
      background-color: ${this.hasPreviousArticle() ? "#0366d6" : "#ccc"};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: ${this.hasPreviousArticle() ? "pointer" : "default"};
      opacity: ${this.hasPreviousArticle() ? "1" : "0.6"};
    `;
    prevButton.disabled = !this.hasPreviousArticle();

    if (this.hasPreviousArticle()) {
      const prevArticle = this.getPreviousArticle();
      prevButton.title = prevArticle.displayName || prevArticle.path;

      prevButton.addEventListener("click", () => {
        const article = this.moveToPreviousArticle();
        if (article && typeof onNavigate === "function") {
          onNavigate(article);
        }
      });
    }

    // Create next button
    const nextButton = document.createElement("button");
    nextButton.className = "nav-button next-button";
    nextButton.innerHTML = "Next Article →";
    nextButton.style.cssText = `
      padding: 10px 15px;
      background-color: ${this.hasNextArticle() ? "#0366d6" : "#ccc"};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: ${this.hasNextArticle() ? "pointer" : "default"};
      opacity: ${this.hasNextArticle() ? "1" : "0.6"};
    `;
    nextButton.disabled = !this.hasNextArticle();

    if (this.hasNextArticle()) {
      const nextArticle = this.getNextArticle();
      nextButton.title = nextArticle.displayName || nextArticle.path;

      nextButton.addEventListener("click", () => {
        const article = this.moveToNextArticle();
        if (article && typeof onNavigate === "function") {
          onNavigate(article);
        }
      });
    }

    // Add buttons to container
    navContainer.appendChild(prevButton);
    navContainer.appendChild(nextButton);

    // Add to parent container if provided
    if (container) {
      container.appendChild(navContainer);
    }

    return navContainer;
  }
}
