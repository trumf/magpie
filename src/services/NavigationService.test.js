// services/NavigationService.test.js
import NavigationService from "./NavigationService";

describe("NavigationService", () => {
  const sampleFiles = [
    {
      type: "directory",
      name: "folder1",
      path: "folder1",
      children: [
        {
          type: "file",
          name: "file1.md",
          path: "folder1/file1.md",
          content: "# File 1 Heading\nContent",
        },
        {
          type: "file",
          name: "file2.md",
          path: "folder1/file2.md",
          content: "No heading here",
        },
      ],
    },
    {
      type: "file",
      name: "root-file.md",
      path: "root-file.md",
      content: "# Root File\nThis is the root file",
    },
  ];

  test("flattenFiles returns only file entries in a flat array", () => {
    const result = NavigationService.flattenFiles(sampleFiles);

    expect(result.length).toBe(3);
    expect(result[0].path).toBe("folder1/file1.md");
    expect(result[1].path).toBe("folder1/file2.md");
    expect(result[2].path).toBe("root-file.md");
    expect(result.every((item) => item.type === "file")).toBe(true);
  });

  test("getNavigationState returns correct navigation data", () => {
    // Test with middle file selected
    const result = NavigationService.getNavigationState(
      sampleFiles,
      "folder1/file1.md"
    );

    expect(result.currentIndex).toBe(0);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(false);
    expect(result.nextFile.path).toBe("folder1/file2.md");
    expect(result.previousFile).toBe(null);

    // Test with last file selected
    const resultLast = NavigationService.getNavigationState(
      sampleFiles,
      "root-file.md"
    );

    expect(resultLast.currentIndex).toBe(2);
    expect(resultLast.hasNext).toBe(false);
    expect(resultLast.hasPrevious).toBe(true);
    expect(resultLast.nextFile).toBe(null);
    expect(resultLast.previousFile.path).toBe("folder1/file2.md");
  });

  test("getDisplayTitle extracts title from h1 or uses filename", () => {
    // Test with file that has an H1 heading
    const fileWithHeading = {
      name: "test.md",
      content: "# Custom Title\nContent here",
    };

    expect(NavigationService.getDisplayTitle(fileWithHeading)).toBe(
      "Custom Title"
    );

    // Test with file without an H1 heading
    const fileWithoutHeading = {
      name: "test2.md",
      content: "No heading here",
    };

    expect(NavigationService.getDisplayTitle(fileWithoutHeading)).toBe(
      "test2.md"
    );

    // Test with directory
    const directory = {
      type: "directory",
      name: "my-folder",
    };

    expect(NavigationService.getDisplayTitle(directory)).toBe("my-folder");

    // Test with file with hashed name
    const hashedFile = {
      name: "Document abcdef1234567890abcdef1234567890.md",
      content: "Content without heading",
    };

    expect(NavigationService.getDisplayTitle(hashedFile)).toBe("Document");
  });

  test("handles empty or null inputs gracefully", () => {
    expect(NavigationService.flattenFiles([])).toEqual([]);
    expect(NavigationService.getNavigationState([], null).hasNext).toBe(false);
    expect(NavigationService.getDisplayTitle(null)).toBe("");
  });
});
