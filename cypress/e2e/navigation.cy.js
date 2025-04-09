describe("Navigation Functionality", () => {
  beforeEach(() => {
    // Visit the root URL
    cy.visit("/");

    // Clear IndexedDB to start fresh
    cy.clearIndexedDB("markdownDB");

    // Reload the page after clearing the database
    cy.reload();

    // Import multiple markdown files for testing navigation
    const files = [
      {
        name: "article1.md",
        content:
          "# Article 1\n\nThis is the first article.\n\nSee also [[article2]].",
      },
      {
        name: "article2.md",
        content:
          "# Article 2\n\nThis is the second article.\n\nSee also [[article3]].",
      },
      {
        name: "article3.md",
        content:
          "# Article 3\n\nThis is the third article.\n\nSee also [[article1]].",
      },
    ];

    // Create a DataTransfer object for the files
    const dataTransfer = new DataTransfer();

    // Create File objects for each markdown file
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

    // Wait for the files to be imported and the UI to update
    cy.contains("Article 1").should("be.visible");
  });

  it("displays the sidebar with article list", () => {
    // Open the menu if it's not already open
    cy.get('button[aria-label="Open menu"]').click();

    // Check if the sidebar contains our articles
    cy.get(".sidebar").should("be.visible");
    cy.get(".sidebar").contains("article1").should("be.visible");
    cy.get(".sidebar").contains("article2").should("be.visible");
    cy.get(".sidebar").contains("article3").should("be.visible");
  });

  it("can navigate between articles via links", () => {
    // Should start on Article 1
    cy.contains("h1", "Article 1").should("be.visible");

    // Navigate to Article 2 by clicking the link
    cy.contains("article2").click();

    // Should now be on Article 2
    cy.contains("h1", "Article 2").should("be.visible");

    // Navigate to Article 3
    cy.contains("article3").click();

    // Should now be on Article 3
    cy.contains("h1", "Article 3").should("be.visible");

    // Navigate back to Article 1
    cy.contains("article1").click();

    // Should now be back on Article 1
    cy.contains("h1", "Article 1").should("be.visible");
  });

  it("can navigate between articles using the sidebar", () => {
    // Open the menu if it's not already open
    cy.get('button[aria-label="Open menu"]').click();

    // Click on article2 in the sidebar
    cy.get(".sidebar").contains("article2").click();

    // Should now be on Article 2
    cy.contains("h1", "Article 2").should("be.visible");

    // Click on article3 in the sidebar
    cy.get(".sidebar").contains("article3").click();

    // Should now be on Article 3
    cy.contains("h1", "Article 3").should("be.visible");
  });

  it("highlights the active article in the sidebar", () => {
    // Open the menu if it's not already open
    cy.get('button[aria-label="Open menu"]').click();

    // The current article (article1) should be highlighted
    cy.get(".sidebar").contains("article1").should("have.class", "active");

    // Navigate to Article 2
    cy.get(".sidebar").contains("article2").click();

    // Now article2 should be highlighted
    cy.get(".sidebar").contains("article2").should("have.class", "active");
    cy.get(".sidebar").contains("article1").should("not.have.class", "active");
  });
});
