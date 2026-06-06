import { exportSelectedBlocks } from "../markdown/exportMarkdown";
import { SelectableBlock } from "../types";

function makeBlock(
  id: string,
  kind: SelectableBlock["kind"],
  markdown: string,
  order: number,
  selected: boolean
): SelectableBlock {
  return { id, kind, markdown, plainText: markdown, selected, order, sourceProviderId: "sample" };
}

const blocks: SelectableBlock[] = [
  makeBlock("b1", "heading", "## Title", 0, true),
  makeBlock("b2", "paragraph", "Hello world.", 1, false),
  makeBlock("b3", "math", "$\nE=mc^2\n$", 2, true),
  makeBlock("b4", "code", "```ts\nconst x = 1;\n```", 3, true),
];

test("excludes unselected blocks", () => {
  const output = exportSelectedBlocks(blocks);
  expect(output).not.toContain("Hello world.");
});

test("preserves selected block order", () => {
  const output = exportSelectedBlocks(blocks);
  const titleIdx = output.indexOf("## Title");
  const mathIdx = output.indexOf("$\nE=mc^2\n$");
  const codeIdx = output.indexOf("```ts");
  expect(titleIdx).toBeLessThan(mathIdx);
  expect(mathIdx).toBeLessThan(codeIdx);
});

test("separates blocks with two newlines", () => {
  const output = exportSelectedBlocks(blocks);
  expect(output).toContain("## Title\n\n$");
});

test("preserves code fences", () => {
  const output = exportSelectedBlocks(blocks);
  expect(output).toContain("```ts\nconst x = 1;\n```");
});

test("preserves math fences", () => {
  const output = exportSelectedBlocks(blocks);
  expect(output).toContain("$\nE=mc^2\n$");
});

test("returns empty string when no blocks selected", () => {
  const none = blocks.map((b) => ({ ...b, selected: false }));
  expect(exportSelectedBlocks(none)).toBe("");
});

test("includes yaml front-matter header", () => {
  const output = exportSelectedBlocks(blocks);
  expect(output).toMatch(/^---\nsource: Response Clipper/);
});
