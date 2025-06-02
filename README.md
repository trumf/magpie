# Markdown ZIP Viewer

A web-based markdown file viewer for ZIP archives with annotation support.

## 📁 Project Structure

```
magpie/
├── public/                          # Entry points & static files
│   ├── index.html                   # Main application entry
│   └── AnnotationPage.html          # Annotation view template
├── src/                             # Source code
│   ├── App.js                       # Main application orchestrator
│   ├── components/                  # UI components & modules
│   │   ├── SidebarManager.js        # Sidebar functionality
│   │   ├── ContentManager.js        # Main content area
│   │   ├── annotations/             # Annotation system
│   │   │   ├── MarkdownAnnotation.js
│   │   │   ├── AnnotationPageHandler.js
│   │   │   ├── AnnotationStorage.js
│   │   │   ├── AnnotationViewer.js
│   │   │   └── annotationPanel.js
│   │   ├── content/                 # Content rendering
│   │   │   └── MarkdownRendering.js
│   │   └── navigation/              # Navigation helpers
│   │       ├── ArticleNavigation.js
│   │       └── SwipeNavigation.js
│   ├── managers/                    # Business logic managers
│   │   ├── ZipFileManager.js        # ZIP file operations
│   │   └── CollectionsManager.js    # Collection management
│   └── utils/                       # Utility functions
│       ├── EventBus.js              # Event communication
│       └── HeadlineExtraction.js    # Text processing
├── assets/                          # Static assets
│   └── styles/                      # CSS files
│       ├── index.css                # Main styles
│       ├── annotation-styles.css    # Annotation styles
│       ├── reset.css                # CSS reset
│       └── themes.css               # Theme definitions
├── tests/                           # Test files
│   ├── TESTING.md                   # Testing documentation
│   └── *.test.js                    # Unit tests
├── docs/                            # Documentation
│   ├── PRD.md                       # Product requirements
│   └── ZipFileManager.md            # Technical docs
├── config/                          # Configuration files
│   ├── jest.config.js               # Jest testing config
│   ├── jest.setup.js                # Test setup
│   └── .babelrc                     # Babel config
└── package.json                     # Dependencies & scripts
```

## 🚀 Getting Started

1. **Open the application**: Open `public/index.html` in your browser
2. **Import a ZIP file**: Click "Import ZIP" and select a ZIP containing markdown files
3. **Browse files**: Click on files in the sidebar to view them
4. **Annotate**: Select text to create annotations
5. **Navigate**: Use swipe gestures or navigation buttons to move between articles

## 🏗️ Architecture

### Event-Driven Design

- **EventBus**: Manages communication between components
- **Modular Components**: Each component handles specific functionality
- **Separation of Concerns**: Clear boundaries between UI, business logic, and data

### Component Responsibilities

- **App.js**: Main orchestrator, manages global state
- **SidebarManager**: File lists, filtering, collections
- **ContentManager**: Markdown rendering, navigation, annotations
- **Managers**: Business logic for data operations
- **Utils**: Shared utility functions

## 🧪 Testing

Tests are organized in the `tests/` directory. Run tests with:

```bash
npm test
```

## 📚 Documentation

Technical documentation is in the `docs/` directory:

- `PRD.md`: Product requirements and feature specifications
- `ZipFileManager.md`: Technical documentation for ZIP file handling

## 🔧 Development

The project uses vanilla JavaScript with ES6 modules for a clean, dependency-free architecture that's easy to understand and extend.

### Adding New Features

1. Create new components in `src/components/`
2. Add business logic to `src/managers/`
3. Use the EventBus for component communication
4. Add tests in `tests/`
5. Update documentation in `docs/`

### File Organization Guidelines

- **Components**: UI-related code with event handlers
- **Managers**: Business logic and data operations
- **Utils**: Pure functions and utilities
- **Assets**: Static files (CSS, images, etc.)
- **Public**: Entry points and templates
- **Tests**: All test files and test-related setup
- **Config**: Build and development configuration
- **Docs**: Documentation and specifications
