describe("ZIP File Import", () => {
  beforeEach(() => {
    // Visit the main page and clear any existing data
    cy.visit("/");
    cy.clearIndexedDB("markdownDB");
    cy.reload();
  });

  it("should allow importing a ZIP file with markdown and asset files", () => {
    // Create a mock ZIP file with markdown and image
    const markdownContent = `# Test Document
    
This is a test document with an image reference.

![Test Image](assets/test-image.png)
    `;

    // Set up the file import
    cy.window().then((win) => {
      // Get the JSZip instance from window (loaded by the app)
      if (!win.JSZip) {
        // Skip test if JSZip is not available
        cy.log("JSZip not found on window, skipping test");
        return;
      }

      // Create a new ZIP file with JSZip
      const zip = new win.JSZip();

      // Add markdown file to zip
      zip.file("test-document.md", markdownContent);

      // Add a dummy image file
      const imageBlob = new Blob(["fake-image-data"], {type: "image/png"});
      zip.file("assets/test-image.png", imageBlob);

      // Generate the final ZIP file
      zip.generateAsync({type: "blob"}).then((zipBlob) => {
        // Create a File object from the Blob
        const zipFile = new File([zipBlob], "test-archive.zip", {
          type: "application/zip",
        });

        // Create DataTransfer object to simulate file input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(zipFile);

        // Find the file input for ZIP files and set its files
        cy.get('input[type="file"][accept=".zip"]').then((input) => {
          input[0].files = dataTransfer.files;
          input[0].dispatchEvent(new Event("change", {bubbles: true}));
        });
      });
    });

    // Verify the file was imported successfully
    cy.contains("Test Document", {timeout: 10000}).should("be.visible");

    // Verify that the content is displayed
    cy.contains("This is a test document").should("be.visible");

    // Reload the page to test persistence
    cy.reload();

    // Content should still be available after reload
    cy.contains("Test Document").should("be.visible");
  });

  it("should correctly process image references in ZIP file imports", () => {
    // Create a more complex ZIP with nested directories and files
    cy.window().then((win) => {
      // Get the JSZip instance from window
      if (!win.JSZip) {
        // Skip test if JSZip is not available
        cy.log("JSZip not found on window, skipping test");
        return;
      }

      const zip = new win.JSZip();

      // Add multiple markdown files
      zip.file("readme.md", "# Welcome\n\nThis is the main readme file.");
      zip.file(
        "docs/getting-started.md",
        "# Getting Started\n\nFollow these steps to get started.\n\n![Setup](../images/setup.png)"
      );

      // Add image files
      const dummyImageBlob = new Blob(["fake-image-data"], {type: "image/png"});
      zip.file("images/setup.png", dummyImageBlob);

      // Generate and upload ZIP
      zip.generateAsync({type: "blob"}).then((zipBlob) => {
        const zipFile = new File([zipBlob], "docs-with-images.zip", {
          type: "application/zip",
        });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(zipFile);

        cy.get('input[type="file"][accept=".zip"]').then((input) => {
          input[0].files = dataTransfer.files;
          input[0].dispatchEvent(new Event("change", {bubbles: true}));
        });
      });
    });

    // Verify the main readme is imported
    cy.contains("Welcome", {timeout: 10000}).should("be.visible");

    // Open the sidebar and navigate to the docs file
    cy.get('button[aria-label="Open menu"]').click();
    cy.contains("getting-started").click();

    // Verify the nested document is displayed with correct content
    cy.contains("Getting Started").should("be.visible");
    cy.contains("Follow these steps").should("be.visible");

    // The image reference should be properly processed
    // We can't easily test the actual image rendering, but we can check that the content is there
    cy.get("img").should("exist");
  });
});
