describe("Import Functionality", () => {
  beforeEach(() => {
    // Visit the root URL
    cy.visit("/");

    // Clear IndexedDB to start fresh
    cy.clearIndexedDB("markdownDB");

    // Reload the page after clearing the database
    cy.reload();
  });

  it("shows the import screen on first visit", () => {
    // Check if the import screen is displayed
    cy.contains("Import Markdown Files").should("be.visible");
    cy.contains("Select Markdown Files").should("be.visible");
    cy.contains("Upload ZIP Archive").should("be.visible");
  });

  it("can import markdown files", () => {
    // Create a sample markdown file
    const markdownContent = "# Test File\n\nThis is a test file for import.";
    const fileName = "test-file.md";

    // Intercept file input change event and programmatically set files
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

    // Verify the file was imported and we're now in reading mode
    cy.contains("Test File").should("be.visible");
    cy.get('button[aria-label="Open menu"]').should("be.visible");
  });

  it("shows error message when import fails", () => {
    // Mock a failed import by intercepting the FileReader API
    cy.window().then((win) => {
      // Override FileReader.prototype.readAsText to simulate failure
      const originalReadAsText = win.FileReader.prototype.readAsText;

      win.FileReader.prototype.readAsText = function () {
        // Trigger an error event
        setTimeout(() => {
          const errorEvent = new ErrorEvent("error", {
            message: "Failed to read file",
          });
          this.dispatchEvent(errorEvent);
        }, 50);
      };

      // Create a sample file
      const blob = new Blob([""], {type: "text/markdown"});
      const testFile = new File([blob], "broken-file.md", {
        type: "text/markdown",
      });

      // Attempt to import
      cy.get('input[type="file"][accept=".md"]').then((input) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        input[0].files = dataTransfer.files;
        input[0].dispatchEvent(new Event("change", {bubbles: true}));
      });

      // Check that an error message is displayed
      cy.contains("Error", {timeout: 10000}).should("be.visible");

      // Restore original function
      win.FileReader.prototype.readAsText = originalReadAsText;
    });
  });
});
