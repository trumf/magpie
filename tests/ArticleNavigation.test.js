/**
 * Test article navigation functionality
 * Uses Jest test runner to validate next/previous article navigation
 */

// Remove Node.js test runner imports
// import {test} from "node:test";
// import assert from "node:assert";

// Create a mock for the navigation functions that we'll implement
// Note: In a real scenario, this would likely be imported from its own module
class ArticleNavigationHelper {
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
}

// Test cases - using Jest syntax
test("ArticleNavigationHelper should handle empty file list", () => {
  const navHelper = new ArticleNavigationHelper([]);

  expect(navHelper.getNextArticle()).toBeNull();
  expect(navHelper.getPreviousArticle()).toBeNull();
  expect(navHelper.hasNextArticle()).toBe(false);
  expect(navHelper.hasPreviousArticle()).toBe(false);
});

test("ArticleNavigationHelper should find correct next and previous articles", () => {
  const testFiles = [
    {path: "article1.md", displayName: "Article 1"},
    {path: "article2.md", displayName: "Article 2"},
    {path: "article3.md", displayName: "Article 3"},
  ];

  const navHelper = new ArticleNavigationHelper(testFiles);

  // At first article (index 0)
  expect(navHelper.getNextArticle()).toEqual(testFiles[1]);
  expect(navHelper.getPreviousArticle()).toBeNull();

  // Move to second article (index 1)
  navHelper.navigateToIndex(1);
  expect(navHelper.getNextArticle()).toEqual(testFiles[2]);
  expect(navHelper.getPreviousArticle()).toEqual(testFiles[0]);

  // Move to last article (index 2)
  navHelper.navigateToIndex(2);
  expect(navHelper.getNextArticle()).toBeNull();
  expect(navHelper.getPreviousArticle()).toEqual(testFiles[1]);
});

test("ArticleNavigationHelper should navigate by path", () => {
  const testFiles = [
    {path: "article1.md", displayName: "Article 1"},
    {path: "article2.md", displayName: "Article 2"},
    {path: "article3.md", displayName: "Article 3"},
  ];

  const navHelper = new ArticleNavigationHelper(testFiles);

  // Navigate to middle article by path
  const result = navHelper.setCurrentArticle("article2.md");
  expect(result).toBe(true);
  expect(navHelper.currentIndex).toBe(1);

  // Try to navigate to a non-existent article
  const badResult = navHelper.setCurrentArticle("nonexistent.md");
  expect(badResult).toBe(false);
  expect(navHelper.currentIndex).toBe(1); // Index shouldn't change
});

test("ArticleNavigationHelper should move to next and previous articles", () => {
  const testFiles = [
    {path: "article1.md", displayName: "Article 1"},
    {path: "article2.md", displayName: "Article 2"},
    {path: "article3.md", displayName: "Article 3"},
  ];

  const navHelper = new ArticleNavigationHelper(testFiles);

  // Start at first article (index 0)
  expect(navHelper.currentIndex).toBe(0);

  // Move to next article
  const nextArticle = navHelper.moveToNextArticle();
  expect(nextArticle).toEqual(testFiles[1]);
  expect(navHelper.currentIndex).toBe(1);

  // Move to next article again
  navHelper.moveToNextArticle();
  expect(navHelper.currentIndex).toBe(2);

  // Try to move beyond the end
  const beyondEnd = navHelper.moveToNextArticle();
  expect(beyondEnd).toBeNull();
  expect(navHelper.currentIndex).toBe(2); // Should stay at the end

  // Move back to previous
  const prevArticle = navHelper.moveToPreviousArticle();
  expect(prevArticle).toEqual(testFiles[1]);
  expect(navHelper.currentIndex).toBe(1);

  // Move to previous again
  navHelper.moveToPreviousArticle();
  expect(navHelper.currentIndex).toBe(0);

  // Try to move before the beginning
  const beforeBeginning = navHelper.moveToPreviousArticle();
  expect(beforeBeginning).toBeNull();
  expect(navHelper.currentIndex).toBe(0); // Should stay at the beginning
});

test("ArticleNavigationHelper should correctly report hasNext and hasPrevious", () => {
  const testFiles = [
    {path: "article1.md", displayName: "Article 1"},
    {path: "article2.md", displayName: "Article 2"},
    {path: "article3.md", displayName: "Article 3"},
  ];

  const navHelper = new ArticleNavigationHelper(testFiles);

  // At first article
  expect(navHelper.hasNextArticle()).toBe(true);
  expect(navHelper.hasPreviousArticle()).toBe(false);

  // At middle article
  navHelper.navigateToIndex(1);
  expect(navHelper.hasNextArticle()).toBe(true);
  expect(navHelper.hasPreviousArticle()).toBe(true);

  // At last article
  navHelper.navigateToIndex(2);
  expect(navHelper.hasNextArticle()).toBe(false);
  expect(navHelper.hasPreviousArticle()).toBe(true);
});

// Export the ArticleNavigationHelper class so we can use it in our implementation
// Note: This export might not be needed if the class is defined elsewhere
// or if these tests are solely for this file's internal helper.
export {ArticleNavigationHelper};
