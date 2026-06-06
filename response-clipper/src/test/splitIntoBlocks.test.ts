import { splitIntoBlocks, _resetIdCounter } from "../markdown/splitIntoBlocks";

beforeEach(() => _resetIdCounter());

const SAMPLE = `## Why this matters

对，这个区别很重要。

$
W_{\\text{up}} \\cdot \\operatorname{RoPE}(c)
\\ne
\\operatorname{RoPE}(W_{\\text{up}} c)
$

原因：

- RoPE operates on paired dimensions.
- Projection changes the basis.

\`\`\`ts
type Message = {
  id: string;
  text: string;
}
\`\`\``;

test("produces expected block kinds in order", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  const kinds = blocks.map((b) => b.kind);
  expect(kinds).toEqual([
    "heading",
    "paragraph",
    "math",
    "paragraph",
    "list_item",
    "list_item",
    "code",
  ]);
});

test("heading block contains the heading text", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  expect(blocks[0].markdown).toBe("## Why this matters");
});

test("math block preserves dollar fences", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  const math = blocks.find((b) => b.kind === "math")!;
  expect(math.markdown.startsWith("$")).toBe(true);
  expect(math.markdown.endsWith("$")).toBe(true);
});

test("code block preserves fences", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  const code = blocks.find((b) => b.kind === "code")!;
  expect(code.markdown.startsWith("```")).toBe(true);
  expect(code.markdown.endsWith("```")).toBe(true);
});

test("list items are separate blocks", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  const items = blocks.filter((b) => b.kind === "list_item");
  expect(items).toHaveLength(2);
  expect(items[0].markdown).toContain("paired dimensions");
  expect(items[1].markdown).toContain("basis");
});

test("blocks have sequential order values", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  blocks.forEach((b, i) => expect(b.order).toBe(i));
});

test("all blocks start as unselected", () => {
  const blocks = splitIntoBlocks(SAMPLE);
  blocks.forEach((b) => expect(b.selected).toBe(false));
});
