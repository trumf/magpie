# ZipFileManager

A JavaScript ES module providing a facade for importing, storing, and managing ZIP files using IndexedDB in web applications.

## Features

- Import ZIP files via a simple API.
- Store ZIP file metadata and contents persistently in IndexedDB.
- Retrieve, update, and delete stored ZIP files.
- Manage read/unread status for individual files within a ZIP.
- Sort files within a ZIP based on various criteria (name, read status, read date).
- Configurable database settings and status reporting.

## Requirements

- Modern web browser with IndexedDB support.
- [JSZip](https://stuk.github.io/jszip/) library must be included in the host project.

## Installation

1.  Ensure JSZip is available in your project (e.g., via CDN or npm).
2.  Import the `ZipFileManager` class from `ZipFileManager.js`.

```html
<!-- Include JSZip library (example using CDN) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- Import the ZipFileManager module -->
<script type="module">
  import {ZipFileManager} from "./ZipFileManager.js";
  // Your application code here
</script>
```

## Usage

### Basic Usage

```javascript
// Import the class
import { ZipFileManager } from "./ZipFileManager.js";

// Create an instance (using default IndexedDB settings)
const zipManager = new ZipFileManager();

// Initialize the database (recommended)
await zipManager.initIndexedDB();

// --- Interacting with ZIP files ---

// Get a File object (e.g., from an <input type="file">)
const zipFileObject = /* ... get file object ... */;

// Save the ZIP file to IndexedDB
try {
  const savedId = await zipManager.saveZipFile(zipFileObject);
  console.log(`ZIP file saved with ID: ${savedId}`);
} catch (error) {
  console.error("Error saving ZIP file:", error);
}

// Get all stored ZIP file records
const allZips = await zipManager.getAllZipFiles();
console.log("Stored ZIPs:", allZips);

// Get a specific ZIP file record by its ID
const specificZip = await zipManager.getZipFileById(savedId);
console.log("Specific ZIP:", specificZip);

// Mark a file within a ZIP as read
const filePathToMark = specificZip.files[0].path; // Example path
await zipManager.markFileAsRead(savedId, filePathToMark);

// Check if a file is read
const isRead = await zipManager.isFileRead(savedId, filePathToMark);
console.log(`File ${filePathToMark} is read: ${isRead}`);

// Sort files within a ZIP record (e.g., unread first)
const sortedFiles = zipManager.sortFilesByReadStatus(
  specificZip.files,
  "unread_first"
);
console.log("Sorted files:", sortedFiles);

// Delete a specific ZIP file
await zipManager.deleteZipFile(savedId);

// Clear all ZIP files from the database
await zipManager.clearZipFiles();
```

### Custom Configuration

You can customize the IndexedDB settings and status reporting when creating an instance:

```javascript
const customConfig = {
  dbName: "MyCustomDB",
  dbVersion: 2,
  storeName: "myZipFiles",
  statusDisplayDuration: 3000, // How long status messages are shown (if using default handler)
  statusCallback: (type, message) => {
    // Implement your own status message handling (e.g., display in a UI element)
    console.log(`[${type.toUpperCase()}] ${message}`);
  },
  // maxContentPreviewLength is handled internally by the parser now
};

const zipManager = new ZipFileManager(customConfig);
```

## API Reference

### `new ZipFileManager(config)`

Creates a new `ZipFileManager` instance.

- `config` (optional): Object with configuration options:
  - `dbName`: Name of the IndexedDB database (default: `'ZipFileDB'`).
  - `dbVersion`: Version of the database (default: `1`).
  - `storeName`: Name of the IndexedDB object store (default: `'zipFiles'`).
  - `statusDisplayDuration`: Default duration (ms) for status messages if using the built-in view handler (default: `5000`).
  - `statusCallback`: A function `(type, message)` to handle status updates (e.g., errors, success). If not provided, a default console logger might be used or messages passed to `view/htmlGenerator.showStatus` if applicable in the context.

### Methods

All methods interacting with the database are `async` and return Promises.

- **`async initIndexedDB()`**: Initializes the IndexedDB database connection. Recommended to call before other DB operations, although methods will attempt to initialize if needed.
- **`async saveZipFile(file)`**: Parses the provided `File` object (must be a ZIP file) and saves its contents and metadata to IndexedDB. Returns the `id` of the saved record.
- **`async getAllZipFiles()`**: Retrieves all ZIP file records from IndexedDB. Returns an array of zip data objects.
- **`async getZipFileById(id)`**: Retrieves a specific ZIP file record by its `id`. Returns the zip data object or `undefined` if not found.
- **`async deleteZipFile(id)`**: Deletes a specific ZIP file record by its `id`.
- **`async clearZipFiles()`**: Deletes all ZIP file records from the database.
- **`async markFileAsRead(zipId, filePath)`**: Marks a specific file within a stored ZIP record as read. Updates the record in the database. Returns `true` on success, `false` on failure (e.g., zip/file not found).
- **`async markFileAsUnread(zipId, filePath)`**: Marks a specific file within a stored ZIP record as unread. Updates the record in the database. Returns `true` on success, `false` on failure.
- **`async toggleReadState(zipId, filePath)`**: Toggles the read state of a specific file within a stored ZIP record. Updates the record. Returns the _new_ read state (`true` if now read, `false` if now unread).
- **`async isFileRead(zipId, filePath)`**: Checks if a specific file within a stored ZIP record is marked as read. Returns `true` or `false`.
- **`async getAllReadFiles(zipId)`**: Retrieves an array of file objects marked as read within a specific ZIP record.
- **`sortFilesByReadStatus(files, sortOrder)`**: Sorts an array of file objects (typically from a retrieved zip data object's `files` property). This is a synchronous method that operates on the provided array. Returns a _new_ sorted array.
  - `files`: The array of file objects to sort.
  - `sortOrder`: String indicating the sort order: `'unread_first'`, `'read_first'`, `'read_date'` (most recent first), `'alphabet'` (default).

## Internal Modules (Implementation Detail)

The `ZipFileManager` class acts as a facade, coordinating several internal modules:

- `db/indexedDBManager.js`: Handles all IndexedDB operations.
- `parser/zipParser.js`: Handles ZIP file parsing using JSZip.
- `status/fileStatusManager.js`: Manages in-memory read status updates and sorting logic.
- `view/htmlGenerator.js`: Provides UI/view helper functions (like `showStatus`).
- `HeadlineExtraction.js`: Utility for extracting display names from Markdown.

Users of `ZipFileManager` typically do not need to interact with these modules directly.

## Data Structure (Conceptual)

While the exact storage is managed internally, conceptually, each ZIP record stored in IndexedDB contains:

- `id`: Auto-generated unique ID.
- `name`: Original filename of the ZIP.
- `size`: Original file size in bytes.
- `timestamp`: When the ZIP was added/updated.
- `fileCount`: Number of files extracted.
- `totalSize`: Approximate total size of extracted content.
- `files`: An array of objects, each representing a file within the ZIP, containing:
  - `path`: Full path within the ZIP.
  - `displayName`: Extracted or default display name.
  - `size`: Size of the extracted content.
  - `content`: The extracted file content (string).
  - `isRead`: Boolean flag indicating read status.
  - `readDate`: ISO string timestamp when marked as read.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
