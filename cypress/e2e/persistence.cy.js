describe("Persistence Functionality", () => {
  beforeEach(() => {
    // Visit the root URL
    cy.visit("/");

    // Clear IndexedDB to start fresh
    cy.clearIndexedDB("markdownDB");

    // Reload the page after clearing the database
    cy.reload();
  });

  it("retains imported files after page refresh", () => {
    // Create a sample markdown file with unique content
    const markdownContent =
      "# Persistence Test\n\nThis file should persist after refresh.";
    const fileName = "persistence-test.md";

    // Import the file
    cy.get('input[type="file"][accept=".md"]').then((input) => {
      // Create a blob that represents a file
      const blob = new Blob([markdownContent], {type: "text/markdown"});
      const testFile = new File([blob], fileName, {type: "text/markdown"});

      // Create a DataTransfer and add the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(testFile);

      // Set the file input's files
      input[0].files = dataTransfer.files;

      // Dispatch the change event
      input[0].dispatchEvent(new Event("change", {bubbles: true}));
    });

    // Verify the file was imported successfully
    cy.contains("Persistence Test").should("be.visible");

    // Refresh the page
    cy.reload();

    // The file should still be available after refresh
    cy.contains("Persistence Test").should("be.visible");

    // Verify content is still intact
    cy.contains("This file should persist after refresh").should("be.visible");
  });

  it("maintains file selection after refresh", () => {
    // Import multiple files
    const files = [
      {
        name: "file1.md",
        content: "# File 1\n\nThis is the first test file.",
      },
      {
        name: "file2.md",
        content: "# File 2\n\nThis is the second test file.",
      },
    ];

    // Create DataTransfer object for files
    const dataTransfer = new DataTransfer();

    // Add each file to the DataTransfer object
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

    // Wait for files to be imported
    cy.contains("File 1").should("be.visible");

    // Navigate to the second file
    cy.get('button[aria-label="Open menu"]').click();
    cy.get(".sidebar").contains("file2").click();

    // Verify the second file is selected
    cy.contains("File 2").should("be.visible");
    cy.contains("This is the second test file").should("be.visible");

    // Refresh the page
    cy.reload();

    // The second file should still be selected
    cy.contains("File 2").should("be.visible");
    cy.contains("This is the second test file").should("be.visible");
  });
});
