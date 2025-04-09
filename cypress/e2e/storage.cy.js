describe("LocalStorage Persistence", () => {
  const testFileName = "storage-test.md";
  const testContent =
    "# Storage Test\n\nTesting local storage persistence after browser refresh.";

  beforeEach(() => {
    // Visit the root URL
    cy.visit("/");

    // Clear IndexedDB to start fresh
    cy.clearIndexedDB("markdownDB");

    // Reload the page after clearing the database
    cy.reload();
  });

  it("verifies data is saved to local storage and persists after refresh", () => {
    // Import a test file
    cy.get('input[type="file"][accept=".md"]').then((input) => {
      const blob = new Blob([testContent], {type: "text/markdown"});
      const testFile = new File([blob], testFileName, {type: "text/markdown"});

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(testFile);

      input[0].files = dataTransfer.files;
      input[0].dispatchEvent(new Event("change", {bubbles: true}));
    });

    // Verify the file was imported successfully
    cy.contains("Storage Test").should("be.visible");

    // Simulate closing the browser and reopening by refreshing the page
    cy.reload();

    // The file should still be available after refresh
    cy.contains("Storage Test").should("be.visible");
    cy.contains(
      "Testing local storage persistence after browser refresh"
    ).should("be.visible");
  });

  it("verifies data persists across multiple refreshes", () => {
    // Import a test file
    cy.get('input[type="file"][accept=".md"]').then((input) => {
      const blob = new Blob([testContent], {type: "text/markdown"});
      const testFile = new File([blob], testFileName, {type: "text/markdown"});

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(testFile);

      input[0].files = dataTransfer.files;
      input[0].dispatchEvent(new Event("change", {bubbles: true}));
    });

    // Verify the file was imported
    cy.contains("Storage Test").should("be.visible");

    // Refresh multiple times to simulate closing and reopening the app
    for (let i = 0; i < 3; i++) {
      cy.reload();
      cy.contains("Storage Test").should("be.visible");
    }

    // Data should still be intact after multiple refreshes
    cy.contains(
      "Testing local storage persistence after browser refresh"
    ).should("be.visible");
  });

  it("maintains user selection state across refreshes", () => {
    // Import multiple files
    const files = [
      {
        name: "test1.md",
        content: "# Test 1\n\nFirst test file.",
      },
      {
        name: "test2.md",
        content: "# Test 2\n\nSecond test file with unique content.",
      },
    ];

    // Create DataTransfer object
    const dataTransfer = new DataTransfer();

    // Add files to DataTransfer
    files.forEach((file) => {
      const blob = new Blob([file.content], {type: "text/markdown"});
      const testFile = new File([blob], file.name, {type: "text/markdown"});
      dataTransfer.items.add(testFile);
    });

    // Import the files
    cy.get('input[type="file"][accept=".md"]').then((input) => {
      input[0].files = dataTransfer.files;
      input[0].dispatchEvent(new Event("change", {bubbles: true}));
    });

    // Verify files were imported
    cy.contains("Test 1").should("be.visible");

    // Select the second file
    cy.get('button[aria-label="Open menu"]').click();
    cy.get(".sidebar").contains("test2").click();

    // Verify second file is displayed
    cy.contains("Test 2").should("be.visible");
    cy.contains("Second test file with unique content").should("be.visible");

    // Refresh the page
    cy.reload();

    // Second file should still be selected
    cy.contains("Test 2").should("be.visible");
    cy.contains("Second test file with unique content").should("be.visible");
  });
});
