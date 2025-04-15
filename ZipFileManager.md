# ZipFileManager

A JavaScript ES module for handling ZIP file imports and storage in IndexedDB for web applications.

## Features

- Import ZIP files and extract their contents
- Store ZIP files and their contents in IndexedDB for persistent storage
- Retrieve, delete, and manage stored ZIP files
- Format file sizes in human-readable formats
- Generate HTML to display ZIP file contents
- Configurable database settings

## Requirements

- Modern web browser with IndexedDB support
- [JSZip](https://stuk.github.io/jszip/) library for ZIP file handling

## Installation

1. Include the ZipFileManager.js module in your project
2. Add JSZip to your project (via npm, CDN, or direct download)

```html
<!-- Include JSZip library -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- Import the ZipFileManager module -->
<script type="module">
  import {ZipFileManager} from "./ZipFileManager.js";
  // Your code here
</script>
```

## Usage

### Basic Usage

```javascript
// Import the module
import {ZipFileManager} from "./ZipFileManager.js";

// Create an instance with default settings
const zipManager = new ZipFileManager();

// Initialize the database
await zipManager.initIndexedDB();

// Save a ZIP file (from a file input)
const fileInput = document.getElementById("zipFileInput");
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file && file.name.endsWith(".zip")) {
    try {
      await zipManager.saveZipFile(file);
      console.log("ZIP file saved successfully");
    } catch (error) {
      console.error("Error saving ZIP file:", error);
    }
  }
});

// Get all stored ZIP files
const zipFiles = await zipManager.getAllZipFiles();

// Display ZIP files in an element
const contentElement = document.getElementById("content");
contentElement.innerHTML = zipManager.generateZipFilesHtml(zipFiles);

// Clear all ZIP files
await zipManager.clearZipFiles();
```

### Custom Configuration

```javascript
const zipManager = new ZipFileManager({
  dbName: "MyCustomDB",
  dbVersion: 2,
  storeName: "myZipFiles",
  maxContentPreviewLength: 500,
  statusDisplayDuration: 3000,
  statusCallback: (type, message) => {
    // Custom status handling
    console.log(`${type}: ${message}`);
  },
});
```

## API Reference

### Constructor

```javascript
new ZipFileManager(config);
```

- `config` (optional): Object with custom configuration options
  - `dbName`: Name of the IndexedDB database (default: 'ZipFileDB')
  - `dbVersion`: Version of the database (default: 1)
  - `storeName`: Name of the object store (default: 'zipFiles')
  - `maxContentPreviewLength`: Maximum length for content previews (default: 1000)
  - `statusDisplayDuration`: Duration to display status messages in milliseconds (default: 5000)
  - `statusCallback`: Custom function to handle status messages (default: null)

### Methods

#### `async initIndexedDB()`

Initializes the IndexedDB database. Returns a Promise that resolves to the database instance.

#### `async saveZipFile(file)`

Saves a ZIP file to IndexedDB.

- `file`: The ZIP file to save (from a file input)
- Returns: Promise that resolves to the ID of the saved file

#### `async getAllZipFiles()`

Gets all ZIP files stored in IndexedDB.

- Returns: Promise that resolves to an array of ZIP file objects

#### `async getZipFileById(id)`

Gets a specific ZIP file by ID.

- `id`: The ID of the ZIP file to retrieve
- Returns: Promise that resolves to the ZIP file object

#### `async clearZipFiles()`

Clears all ZIP files from IndexedDB.

- Returns: Promise that resolves when completed

#### `async deleteZipFile(id)`

Deletes a specific ZIP file by ID.

- `id`: The ID of the ZIP file to delete
- Returns: Promise that resolves when completed

#### `formatSize(bytes)`

Formats a file size in bytes to a human-readable string.

- `bytes`: Size in bytes
- Returns: Formatted size string (e.g., "1.23 KB")

#### `generateZipFilesHtml(zipFiles)`

Generates HTML content to display ZIP files.

- `zipFiles`: Array of ZIP file objects
- Returns: HTML string

#### `showStatus(type, message, element = null)`

Displays a status message.

- `type`: Type of status message ('success', 'error', 'info')
- `message`: The message to display
- `element`: Optional DOM element to display the message in

## Data Structure

ZIP files are stored in IndexedDB with the following structure:

```javascript
{
  id: [auto-generated],
  name: "filename.zip",
  size: 12345, // original file size in bytes
  timestamp: "2023-04-01T12:34:56.789Z",
  fileCount: 10,
  totalSize: 54321, // total size of extracted contents
  files: [
    {
      path: "folder/file.txt",
      size: 1234,
      content: "File content (truncated if too long)..."
    },
    // more files...
  ]
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
