/**
 * AnnotationViewer.js
 *
 * A module for retrieving and displaying annotations from IndexedDB.
 * Works with the AnnotationStorage module to fetch annotation data.
 */

import {AnnotationStorage} from "./AnnotationStorage.js";
import {extractDisplayName} from "./HeadlineExtraction.js";

export class AnnotationViewer {
  constructor(config = {}) {
    this.storage = new AnnotationStorage(config);
    this.initialized = false;
  }

  /**
   * Initialize the annotation viewer
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.initialized) {
      await this.storage.initIndexedDB();
      this.initialized = true;
    }
  }

  /**
   * Get all annotations from storage
   * @returns {Promise<Array>} Array of all annotation objects
   */
  async getAllAnnotations() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.storage.getAllAnnotations();
  }

  /**
   * Get annotations for a specific file
   * @param {string} fileId - The ID of the file to get annotations for
   * @returns {Promise<Array>} Array of annotation objects for the file
   */
  async getAnnotationsByFile(fileId) {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.storage.getAnnotationsByFile(fileId);
  }

  /**
   * Search for annotations by keyword
   * @param {string} query - The search query
   * @returns {Promise<Array>} Array of matching annotation objects
   */
  async searchAnnotations(query) {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.storage.searchAnnotations(query);
  }

  /**
   * Search for annotations by tag
   * @param {string} tag - The tag to search for
   * @returns {Promise<Array>} Array of annotation objects with the specified tag
   */
  async searchAnnotationsByTag(tag) {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.storage.searchAnnotationsByTag(tag);
  }

  /**
   * Format a single annotation for display
   * @param {Object} annotation - The annotation object
   * @returns {Object} Formatted annotation with display properties
   */
  formatAnnotationForDisplay(annotation) {
    // Extract a clean display name for the file path
    const displayFilePath = extractDisplayName(
      annotation.note || annotation.content || "", // Use note or content for display name
      annotation.filePath
    );

    // --- Handle Article vs Text Annotations ---
    let displayText;
    if (annotation.anchor && annotation.anchor.text) {
      // It's a text annotation, display the quoted text
      displayText = `"${this.truncateText(annotation.anchor.text, 100)}"`;
    } else {
      // It's an article annotation, display a placeholder and snippet
      displayText = `Article Note: ${this.truncateText(
        annotation.content,
        80
      )}`;
    }
    // --- End Handle Article vs Text Annotations ---

    return {
      ...annotation,
      // displayText is now set based on whether it's an article note or not
      displayText: displayText,
      displayDate: this.formatDate(annotation.dateCreated),
      fileLink: `?file=${encodeURIComponent(
        annotation.fileId
      )}&path=${encodeURIComponent(annotation.filePath)}`,
      tagList: (annotation.tags || []).join(", "),
      displayFilePath: displayFilePath || annotation.filePath, // Use the clean name or fall back to original
      isArticleNote: !annotation.anchor, // Add a flag for easier styling/rendering if needed
    };
  }

  /**
   * Format a list of annotations for display
   * @param {Array} annotations - Array of annotation objects
   * @returns {Array} Array of formatted annotation objects
   */
  formatAnnotationsForDisplay(annotations) {
    return annotations.map((annotation) =>
      this.formatAnnotationForDisplay(annotation)
    );
  }

  /**
   * Truncate text to a specific length with ellipsis
   * @param {string} text - The text to truncate
   * @param {number} maxLength - Maximum length before truncation
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  /**
   * Format a date for display
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date) return "";
    if (typeof date === "string") {
      date = new Date(date);
    }
    return date.toLocaleString();
  }

  /**
   * Generate HTML for displaying a list of annotations
   * @param {Array} annotations - Array of annotation objects
   * @returns {string} HTML content for the annotation list
   */
  generateAnnotationListHtml(annotations) {
    const formattedAnnotations = this.formatAnnotationsForDisplay(annotations);

    if (formattedAnnotations.length === 0) {
      return `<div class="empty-state">
        <p>No annotations found</p>
        <p>Create annotations by selecting text in markdown documents or using the 'Add Note to Article' button.</p>
      </div>`;
    }

    let html = `<div class="annotation-list">`;

    formattedAnnotations.forEach((annotation) => {
      // Use the pre-formatted displayText which handles both cases
      html += `
        <div class="annotation-item" data-id="${annotation.id}">
          <div class="annotation-quote ${
            annotation.isArticleNote ? "article-note-indicator" : ""
          }">${annotation.displayText}</div>
          <div class="annotation-note">${annotation.content}</div>
          <div class="annotation-meta">
            <span class="annotation-file">
              <a href="${annotation.fileLink}" class="file-link" title="${
        annotation.filePath
      }">
                ${annotation.displayFilePath}
              </a>
            </span>
            <span class="annotation-date">${annotation.displayDate}</span>
            ${
              annotation.tagList
                ? `<span class="annotation-tags">${annotation.tagList}</span>`
                : ""
            }
          </div>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  /**
   * Render annotations to a DOM element
   * @param {Array} annotations - Array of annotation objects
   * @param {HTMLElement} element - The element to render to
   */
  renderAnnotationsToElement(annotations, element) {
    if (!element) return;

    const html = this.generateAnnotationListHtml(annotations);
    element.innerHTML = html;

    // Add event listeners to file links if needed
    const fileLinks = element.querySelectorAll(".file-link");
    fileLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        // Properly handle navigation to the file
        event.preventDefault();
        const href = link.getAttribute("href");

        // Navigate to the viewer page with the file parameters
        if (href) {
          // If we're already on the viewer page, update the URL
          if (window.location.pathname.includes("MarkdownZipViewer.html")) {
            window.location.search = href.substring(href.indexOf("?"));
          } else {
            // Navigate to the viewer page with the parameters
            window.location.href = `MarkdownZipViewer.html${href}`;
          }

          console.log("Navigating to file:", href);
        }
      });
    });
  }
}
