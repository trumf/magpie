// SwipeNavigation.js

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 50; // Minimum pixels for a valid swipe

// Store references passed during setup
let config = {
  contentElement: null,
  articleNavigator: null,
  displayFileCallback: null, // Function to call to display the new file
  updateSidebarCallback: null, // Function to update sidebar selection
};

function handleTouchStart(event) {
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
}

function handleTouchMove(event) {
  if (!config.contentElement) return; // Ensure element exists

  // Prevent default only if a horizontal swipe is likely
  const currentX = event.changedTouches[0].screenX;
  const currentY = event.changedTouches[0].screenY;
  const diffX = Math.abs(touchStartX - currentX);
  const diffY = Math.abs(touchStartY - currentY);

  if (diffX > diffY && diffX > 10) {
    // Check horizontal dominance and minimum move
    // Check if scrolling is at the edge horizontally
    const atLeftEdge = config.contentElement.scrollLeft === 0;
    const atRightEdge =
      config.contentElement.scrollLeft + config.contentElement.clientWidth >=
      config.contentElement.scrollWidth - 1; // Allow for rounding

    // Only prevent default if likely horizontal swipe AND not trying to scroll content horizontally
    // Or if we are trying to swipe past the horizontal scroll boundaries
    if (
      !config.contentElement.style.overflowX ||
      config.contentElement.style.overflowX === "hidden" ||
      (diffX > 0 && atLeftEdge) ||
      (diffX < 0 && atRightEdge)
    ) {
      event.preventDefault();
    }
  }
}

function handleTouchEnd(event) {
  touchEndX = event.changedTouches[0].screenX;
  touchEndY = event.changedTouches[0].screenY;
  handleSwipeGesture();
}

function handleSwipeGesture() {
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;

  // Check if it's primarily a horizontal swipe and meets distance criteria
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
    if (
      !config.articleNavigator ||
      !config.displayFileCallback ||
      !config.updateSidebarCallback
    ) {
      console.warn("Swipe navigation not fully configured.");
      return;
    }

    let nextArticle = null;
    if (diffX > 0) {
      // Swiped Right (Previous Article)
      nextArticle = config.articleNavigator.getPreviousArticle();
      console.log("Swipe Right - Previous Article:", nextArticle?.path);
    } else {
      // Swiped Left (Next Article)
      nextArticle = config.articleNavigator.getNextArticle();
      console.log("Swipe Left - Next Article:", nextArticle?.path);
    }

    if (nextArticle) {
      // Update sidebar first
      config.updateSidebarCallback(nextArticle);

      // Trigger display of the new file via the callback
      config.displayFileCallback(nextArticle);
    }
  }
  // Reset coordinates for next swipe detection
  touchStartX = 0;
  touchStartY = 0;
  touchEndX = 0;
  touchEndY = 0;
}

/**
 * Sets up swipe navigation listeners on the content element.
 * @param {HTMLElement} contentElement - The element to attach listeners to.
 * @param {object} articleNavigator - Instance of ArticleNavigationHelper.
 * @param {function} displayFileCallback - Function to call when a new file should be displayed.
 * @param {function} updateSidebarCallback - Function to call to update the sidebar selection.
 */
export function setupSwipeNavigation(
  contentElement,
  articleNavigator,
  displayFileCallback,
  updateSidebarCallback
) {
  if (
    !contentElement ||
    !articleNavigator ||
    !displayFileCallback ||
    !updateSidebarCallback
  ) {
    console.error("SwipeNavigation setup is missing required parameters.");
    return;
  }

  // Store configuration
  config = {
    contentElement,
    articleNavigator,
    displayFileCallback,
    updateSidebarCallback,
  };

  // Remove existing listeners first to prevent duplicates
  contentElement.removeEventListener("touchstart", handleTouchStart);
  contentElement.removeEventListener("touchmove", handleTouchMove);
  contentElement.removeEventListener("touchend", handleTouchEnd);

  // Add listeners only if on mobile (or touch-enabled device)
  // A more robust check might be needed, but window width is a start
  if (
    window.matchMedia("(pointer: coarse)").matches ||
    window.innerWidth <= 768
  ) {
    console.log("Setting up swipe navigation listeners.");
    contentElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    }); // Start passive
    contentElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    }); // Becomes active if needed
    contentElement.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
  } else {
    console.log("Swipe navigation not enabled for this device/viewport.");
  }
}

// Export handlers for testing purposes if needed, though setup is the main export
export {
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleSwipeGesture,
  // Expose internal state via config for testing
  config as testConfig,
  // Expose coordinates directly for test manipulation
  touchStartX,
  touchStartY,
  touchEndX,
  touchEndY,
};

// Add internal test helper (alternative to exporting raw vars)
export function __setTestCoords(_startX, _startY, _endX, _endY) {
  if (process.env.NODE_ENV === "test") {
    // Only allow in test environment
    touchStartX = _startX;
    touchStartY = _startY;
    touchEndX = _endX;
    touchEndY = _endY;
  } else {
    console.warn("__setTestCoords should only be used in test environments.");
  }
}
