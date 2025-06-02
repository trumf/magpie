# Product Requirements Document: Markdown Annotation Tool

## 1. Product Overview

### 1.1 Purpose

The Markdown Annotation Tool is a web-based application that allows users to import, view, and annotate Markdown documents. Users can add notes to entire articles, sections, paragraphs, sentences, or individual words, organizing their thoughts and research in a structured manner.

### 1.2 Target Users

- Researchers compiling literature reviews
- Students taking study notes
- Writers reviewing drafts
- Knowledge workers organizing information
- Academics analyzing texts

### 1.3 Value Proposition

- Simplifies the process of document annotation in a familiar web interface
- Works entirely client-side for privacy and offline access
- Provides a unified system for document storage and annotation
- Optimized specifically for Markdown documents

## 2. Core Features

### 2.1 Document Management

- **File Import**: Upload Markdown (.md) files through drag-and-drop or file picker
- **Document Storage**: Save documents to browser's IndexedDB for persistent access
- **Document Navigation**: Browse, search, and switch between stored documents

### 2.2 Document Display

- **Markdown Rendering**: Convert Markdown to readable HTML with proper formatting
- **Reading View**: Clean, distraction-free interface optimized for reading
- **Element Identification**: Automatically assign IDs to document elements for stable annotation anchoring

### 2.3 Annotation System

- **Text Selection**: Select any text portion within a document
- **Annotation Creation**: Add notes to selected text through a simple interface
- **Annotation Types**: Support for general notes, questions, important highlights, and definitions
- **Visual Indicators**: Highlight annotated text with customizable styles
- **Note Management**: Create, edit, delete, and categorize annotations

### 2.4 Organization Tools

- **Tag System**: Categorize annotations with custom tags
- **Annotation Browser**: View all annotations for a document in a sidebar
- **Export/Import**: Save and restore annotation data

## 3. User Experience

### 3.1 Interface Layout

- **top navigation bar**
  - one page for import
  - one page to read articles
  - one pahe to view tags
- **Responsive Design**: Adaptable layout for different screen sizes
- **Collapsible Panels**: Toggle visibility of sidebars for focused reading

### 3.2 Interaction Flow

1. User imports a Markdown document
2. Document appears in the main panel, rendered as formatted HTML
3. User selects text and adds an annotation via popup menu
4. Annotation is stored and the text is highlighted
5. User can view and edit annotations in the right sidebar
6. Annotations persist between sessions

### 3.3 Visual Design

- **Clean, Minimalist Aesthetic**: Focus on content and readability
- **Highlight Styling**: Subtle text highlighting that doesn't impede readability
- **Clear Typography**: Readable font choices and text sizing
- **Color Coding**: Optional color system for different annotation types

## 4. Technical Requirements

### 4.1 Browser Compatibility

- Support for modern browsers (Chrome, Firefox, Safari, Edge)
- No support required for IE11 or older browsers

### 4.2 Performance Targets

- Initial load time under 3 seconds
- Smooth scrolling performance with many annotations
- Support for documents up to 50,000 words

### 4.3 Storage Limitations

- Maximum document size: 5MB per file
- whatever indexdb can handle

### 4.4 Offline Functionality

- Full functionality without internet connection
- Local storage of all documents and annotations

## 5. MVP Scope

### 5.1 Included in MVP

- Basic file upload for Markdown documents
- Markdown rendering with element identification
- Text selection and annotation creation
- Annotation storage in IndexedDB
- Document browser for switching between documents
- Annotation highlighting in documents

### 5.2 Future Enhancements (Post-MVP)

- zip file upload
- Advanced search with filters
- Mobile optimization
- PDF document support
- Export to various formats
- Annotation templates

## 6. Success Metrics

### 6.1 Performance Metrics

- Average document load time < 2 seconds
- Annotation creation time < 1 second
- Search result display < 0.5 seconds

### 6.2 User Experience Metrics

- Number of documents imported per user
- Number of annotations created per document
- Duration of reading/annotation sessions
- Feature usage statistics

## 7. Development Timeline

### 7.1 Phase 1: Foundation (Week 1-2)

- Project setup and core infrastructure
- File import and storage system
- Basic Markdown rendering

### 7.2 Phase 2: Core Functionality (Week 3-4)

- Text selection and anchoring system
- Annotation creation and storage
- Basic UI implementation

### 7.3 Phase 3: User Experience (Week 5-6)

- Improved document navigation
- Annotation management interface
- Visual styling and interaction refinement

### 7.4 Phase 4: Finalization (Week 7-8)

- Search functionality
- Export/import capabilities
- Performance optimization
- Testing and bug fixes

## 8. Technical Architecture

### 8.1 Front-End

- HTML5, CSS3, JavaScript (ES6+)
- Markdown parsing (marked.js)
- IndexedDB for storage

### 8.2 Modular Components

- FileManager: Handles document import and storage
- MarkdownRenderer: Converts Markdown to HTML
- SelectionManager: Manages text selection
- AnnotationEngine: Creates and retrieves annotations
- UIController: Manages user interface

### 8.3 Data Schema

- Document storage with content, metadata, and unique identifiers
- Annotation storage with robust anchoring information and user notes
- Indexes for efficient querying and retrieval

## 9. Limitations and Constraints

### 9.1 Technical Limitations

- Browser storage limits
- Text selection API inconsistencies across browsers
- Performance challenges with very large documents

### 9.2 Out of Scope

- Server-side processing or storage
- Real-time collaboration features (initial version)
- Native mobile applications
- Support for non-Markdown formats (PDF, DOCX, etc.)
