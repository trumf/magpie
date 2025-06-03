/**
 * CollectionsManager.test.js
 *
 * Tests for the collections management functionality.
 */

import {refreshCollections, selectCollection} from "./CollectionsManager.js";

describe("CollectionsManager", () => {
  // Mock elements and functions
  let mockZipManager;
  let mockCollectionList;
  let mockMarkdownContent;
  let mockDisplayZipContents;
  let mockConfirm;
  let mockCollectionContainer;
  let mockCollectionToggle;

  beforeEach(() => {
    // Mock DOM elements
    mockCollectionList = {
      innerHTML: "",
      appendChild: jest.fn(),
    };

    mockMarkdownContent = {
      innerHTML: "",
    };

    // Mock container and toggle
    mockCollectionContainer = {
      classList: {
        contains: jest.fn().mockReturnValue(false),
        remove: jest.fn(),
      },
    };

    mockCollectionToggle = {
      classList: {
        remove: jest.fn(),
      },
    };

    // Mock getElementById for the container and toggle
    document.getElementById = jest.fn().mockImplementation((id) => {
      if (id === "collection-list-container") return mockCollectionContainer;
      if (id === "collections-toggle") return mockCollectionToggle;
      return null;
    });

    // Mock zipManager and its methods
    mockZipManager = {
      getAllZipFiles: jest.fn(),
      getZipFileById: jest.fn(),
      deleteZipFile: jest.fn(),
    };

    // Mock displayZipContents function
    mockDisplayZipContents = jest.fn();

    // Mock document.createElement for creating list items and buttons
    document.createElement = jest.fn().mockImplementation((tag) => {
      if (tag === "li") {
        return {
          textContent: "",
          dataset: {},
          appendChild: jest.fn(),
          addEventListener: jest.fn(),
        };
      } else if (tag === "button") {
        return {
          className: "",
          textContent: "",
          addEventListener: jest.fn(),
        };
      }

      return {};
    });

    // Mock the confirm dialog
    mockConfirm = jest.spyOn(window, "confirm");
    mockConfirm.mockImplementation(() => true);
  });

  describe("refreshCollections", () => {
    test('should show "No collections yet" when there are no collections', async () => {
      // Arrange
      mockZipManager.getAllZipFiles.mockResolvedValue([]);
      mockCollectionContainer.classList.contains.mockReturnValue(true);

      // Act
      await refreshCollections(
        mockZipManager,
        mockCollectionList,
        null,
        mockMarkdownContent,
        mockDisplayZipContents
      );

      // Assert
      expect(mockZipManager.getAllZipFiles).toHaveBeenCalled();
      expect(mockCollectionList.innerHTML).toContain("No collections yet");
      expect(mockCollectionContainer.classList.remove).toHaveBeenCalledWith(
        "collapsed"
      );
      expect(mockCollectionToggle.classList.remove).toHaveBeenCalledWith(
        "collapsed"
      );
    });

    test("should not remove collapsed class if container is not collapsed", async () => {
      // Arrange
      mockZipManager.getAllZipFiles.mockResolvedValue([]);
      mockCollectionContainer.classList.contains.mockReturnValue(false);

      // Act
      await refreshCollections(
        mockZipManager,
        mockCollectionList,
        null,
        mockMarkdownContent,
        mockDisplayZipContents
      );

      // Assert
      expect(mockCollectionContainer.classList.contains).toHaveBeenCalledWith(
        "collapsed"
      );
      expect(mockCollectionContainer.classList.remove).not.toHaveBeenCalled();
      expect(mockCollectionToggle.classList.remove).not.toHaveBeenCalled();
    });

    test("should create list items for each collection", async () => {
      // Arrange
      const mockCollections = [
        {id: 1, name: "Collection 1", timestamp: new Date().getTime()},
        {id: 2, name: "Collection 2", timestamp: new Date().getTime()},
      ];

      mockZipManager.getAllZipFiles.mockResolvedValue(mockCollections);

      const mockLiElements = [];
      for (let i = 0; i < mockCollections.length; i++) {
        const mockLi = {
          textContent: "",
          dataset: {},
          appendChild: jest.fn(),
          addEventListener: jest.fn(),
        };
        mockLiElements.push(mockLi);
      }

      let createElementCallCount = 0;
      document.createElement.mockImplementation((tag) => {
        if (tag === "li") {
          return mockLiElements[createElementCallCount++];
        } else if (tag === "button") {
          return {
            className: "",
            textContent: "",
            addEventListener: jest.fn(),
          };
        }
        return {};
      });

      // Act
      await refreshCollections(
        mockZipManager,
        mockCollectionList,
        null,
        mockMarkdownContent,
        mockDisplayZipContents
      );

      // Assert
      expect(mockZipManager.getAllZipFiles).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith("li");
      expect(document.createElement).toHaveBeenCalledWith("button");

      // Check if the correct number of list items were added
      expect(document.createElement).toHaveBeenCalledTimes(
        mockCollections.length * 2
      ); // li + button for each collection

      // Check text content of list items
      mockLiElements.forEach((mockLi, index) => {
        expect(mockLi.textContent).toContain(mockCollections[index].name);
        expect(mockLi.dataset.id).toBe(mockCollections[index].id);
      });
    });

    test("should handle delete button click", async () => {
      // Arrange
      const mockCollection = {
        id: 1,
        name: "Collection 1",
        timestamp: new Date().getTime(),
      };
      mockZipManager.getAllZipFiles.mockResolvedValue([mockCollection]);

      let deleteClickHandler;

      const mockDeleteButton = {
        className: "",
        textContent: "",
        addEventListener: jest.fn((event, handler) => {
          if (event === "click") deleteClickHandler = handler;
        }),
      };

      const mockLi = {
        textContent: "",
        dataset: {},
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
      };

      document.createElement = jest.fn().mockImplementation((tag) => {
        if (tag === "li") return mockLi;
        if (tag === "button") return mockDeleteButton;
        return {};
      });

      // Act - first call refreshCollections to set up the list
      await refreshCollections(
        mockZipManager,
        mockCollectionList,
        mockCollection.id,
        mockMarkdownContent,
        mockDisplayZipContents
      );

      // Verify click handler was registered
      expect(mockDeleteButton.addEventListener).toHaveBeenCalledWith(
        "click",
        expect.any(Function)
      );
      expect(deleteClickHandler).toBeDefined();

      // Mock event object
      const mockEvent = {stopPropagation: jest.fn()};

      // Simulate clicking the delete button
      await deleteClickHandler(mockEvent);

      // Assert
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockZipManager.deleteZipFile).toHaveBeenCalledWith(
        mockCollection.id
      );
      expect(mockMarkdownContent.innerHTML).toBe("");
    });
  });

  describe("selectCollection", () => {
    test("should load and display the selected collection", async () => {
      // Arrange
      const collectionId = 123;
      const mockZipData = {id: collectionId, files: []};
      mockZipManager.getZipFileById.mockResolvedValue(mockZipData);

      // Act
      const result = await selectCollection(
        mockZipManager,
        collectionId,
        mockDisplayZipContents
      );

      // Assert
      expect(mockZipManager.getZipFileById).toHaveBeenCalledWith(collectionId);
      expect(mockDisplayZipContents).toHaveBeenCalledWith(mockZipData);
      expect(result).toEqual({newCurrentZipId: collectionId});
    });
  });
});
