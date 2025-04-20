/**
 * CollectionsManager.js
 *
 * A module for managing ZIP file collections using IndexedDB.
 * Provides functions for displaying, selecting, and deleting collections.
 */

/**
 * Refresh and render the list of ZIP imports
 * @param {Object} zipManager - The ZipFileManager instance
 * @param {HTMLElement} collectionList - The collection list DOM element
 * @param {number|null} currentZipId - The currently selected ZIP ID
 * @param {HTMLElement} markdownContent - The markdown content DOM element
 * @returns {Promise<void>}
 */
export async function refreshCollections(
  zipManager,
  collectionList,
  currentZipId,
  markdownContent
) {
  collectionList.innerHTML = ""; // clear old
  const cols = await zipManager.getAllZipFiles();

  if (cols.length === 0) {
    collectionList.innerHTML = '<li class="empty">No collections yet</li>';
    return;
  }

  cols.forEach((col) => {
    const li = document.createElement("li");
    li.textContent = `${col.name} — ${new Date(
      col.timestamp
    ).toLocaleString()}`;
    li.dataset.id = col.id;

    // delete button
    const del = document.createElement("button");
    del.className = "delete-col";
    del.textContent = "🗑️";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm("Delete this collection?")) {
        await zipManager.deleteZipFile(col.id);
        if (currentZipId === col.id) {
          markdownContent.innerHTML = "";
          return {newCurrentZipId: null};
        }
        await refreshCollections(
          zipManager,
          collectionList,
          currentZipId,
          markdownContent
        );
      }
    });

    li.appendChild(del);

    // select on click
    li.addEventListener("click", () =>
      selectCollection(zipManager, col.id, displayZipContents)
    );

    collectionList.appendChild(li);
  });
}

/**
 * Select a collection and display its files
 * @param {Object} zipManager - The ZipFileManager instance
 * @param {number} id - The ID of the collection to select
 * @param {Function} displayZipContents - Function to display ZIP contents
 * @returns {Promise<{ newCurrentZipId: number }>}
 */
export async function selectCollection(zipManager, id, displayZipContents) {
  const zipData = await zipManager.getZipFileById(id);
  displayZipContents(zipData);
  return {newCurrentZipId: id};
}
