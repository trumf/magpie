// Tests for headline extraction functionality
import {test} from "node:test";
import assert from "node:assert";
import {extractDisplayName} from "./HeadlineExtraction.js";

test("extracts h1 from markdown content", () => {
  const content = `# This is a Title\n\nSome content here`;
  const filename = "document with hash a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.md";

  assert.strictEqual(extractDisplayName(content, filename), "This is a Title");
});

test("extracts h1 with # inside content", () => {
  const content = `# Title with # symbol\n\nContent`;
  const filename = "file a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.md";

  assert.strictEqual(
    extractDisplayName(content, filename),
    "Title with # symbol"
  );
});

test("extracts h1 when it appears after other content", () => {
  const content = `Some initial text\n\n# The Real Title\n\nMore content`;
  const filename = "document a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.md";

  assert.strictEqual(extractDisplayName(content, filename), "The Real Title");
});

test("falls back to cleaned filename when no h1 is present", () => {
  const content = `Content without any headlines`;
  const filename = "My Document a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.md";

  assert.strictEqual(extractDisplayName(content, filename), "My Document");
});

test("falls back to cleaned filename when content is empty", () => {
  const content = "";
  const filename = "Empty Document a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.md";

  assert.strictEqual(extractDisplayName(content, filename), "Empty Document");
});

test("handles filenames without hashes correctly", () => {
  const content = `No headline here`;
  const filename = "Regular Filename.md";

  assert.strictEqual(extractDisplayName(content, filename), "Regular Filename");
});

test("handles uppercase MD extension", () => {
  const content = `No headline`;
  const filename = "Document with hash a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4.MD";

  assert.strictEqual(
    extractDisplayName(content, filename),
    "Document with hash"
  );
});

// New tests for complex Notion export paths
test("handles Notion directory and file hash patterns", () => {
  const content = `No headline here`;
  const filename =
    "Finance 75604854049d4b4e95f5c72ed1a6b792/Bästa aktiefonderna 2025 Lista med de bästa fond 1803c4fa8cc381a29fb8fac09ec0cd16.md";

  assert.strictEqual(
    extractDisplayName(content, filename),
    "Bästa aktiefonderna 2025 Lista med de bästa fond"
  );
});

test("extracts headline from Notion files with complex paths", () => {
  const content = `# Allt du behöver veta om räntor: Zinos räntetriangel\n\nSome content here`;
  const filename =
    "Finance 75604854049d4b4e95f5c72ed1a6b792/Allt du behöver veta om räntor Zinos räntetrian 1803c4fa8cc3816a9399e044613d876e.md";

  assert.strictEqual(
    extractDisplayName(content, filename),
    "Allt du behöver veta om räntor: Zinos räntetriangel"
  );
});
