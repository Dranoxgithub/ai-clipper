import { SelectableBlock, SelectableBlockKind } from "../types";

let _idCounter = 0;
function nextId(): string {
  return `block-${++_idCounter}`;
}

// Exported for tests to reset counter
export function _resetIdCounter(): void {
  _idCounter = 0;
}

function makeBlock(
  kind: SelectableBlockKind,
  markdown: string,
  order: number
): SelectableBlock {
  const trimmed = markdown.trim();
  return {
    id: nextId(),
    kind,
    markdown: trimmed,
    plainText: trimmed.replace(/[#`$*_~|]/g, "").trim(),
    selected: false,
    order,
  };
}

export function splitIntoBlocks(markdown: string): SelectableBlock[] {
  const blocks: SelectableBlock[] = [];
  let order = 0;

  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const fence = line.trim().match(/^(`{3,})/)?.[1] ?? "```";
      const collected: string[] = [line];
      i++;
      while (i < lines.length) {
        collected.push(lines[i]);
        if (lines[i].trim() === fence) {
          i++;
          break;
        }
        i++;
      }
      blocks.push(makeBlock("code", collected.join("\n"), order++));
      continue;
    }

    // Display math block: standalone $ on its own line
    if (line.trim() === "$") {
      const collected: string[] = [line];
      i++;
      while (i < lines.length) {
        collected.push(lines[i]);
        if (lines[i].trim() === "$") {
          i++;
          break;
        }
        i++;
      }
      blocks.push(makeBlock("math", collected.join("\n"), order++));
      continue;
    }

    // Heading
    if (/^#{1,6}\s/.test(line.trim())) {
      blocks.push(makeBlock("heading", line, order++));
      i++;
      continue;
    }

    // Thematic break
    if (/^(---+|\*\*\*+|___+)\s*$/.test(line.trim())) {
      blocks.push(makeBlock("thematic_break", line, order++));
      i++;
      continue;
    }

    // List item — collect consecutive list items as separate blocks
    if (/^[-*+]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      // Each list item is its own block
      let itemLines: string[] = [line];
      i++;
      // Collect continuation lines (indented) belonging to this item
      while (i < lines.length && /^[ \t]+\S/.test(lines[i])) {
        itemLines.push(lines[i]);
        i++;
      }
      blocks.push(makeBlock("list_item", itemLines.join("\n"), order++));
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line.trim())) {
      const collected: string[] = [line];
      i++;
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        collected.push(lines[i]);
        i++;
      }
      blocks.push(makeBlock("quote", collected.join("\n"), order++));
      continue;
    }

    // Table: starts with |
    if (/^\|/.test(line.trim())) {
      const collected: string[] = [line];
      i++;
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        collected.push(lines[i]);
        i++;
      }
      blocks.push(makeBlock("table", collected.join("\n"), order++));
      continue;
    }

    // Paragraph: collect until blank line or block-level element
    const collected: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i];
      if (
        next.trim() === "" ||
        /^#{1,6}\s/.test(next.trim()) ||
        /^```/.test(next.trim()) ||
        next.trim() === "$" ||
        /^[-*+]\s/.test(next.trim()) ||
        /^\d+\.\s/.test(next.trim()) ||
        /^>\s?/.test(next.trim()) ||
        /^\|/.test(next.trim()) ||
        /^(---+|\*\*\*+|___+)\s*$/.test(next.trim())
      ) {
        break;
      }
      collected.push(next);
      i++;
    }
    blocks.push(makeBlock("paragraph", collected.join("\n"), order++));
  }

  return blocks;
}
