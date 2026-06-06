import { SelectableBlock } from "../types";

export function exportSelectedBlocks(blocks: SelectableBlock[]): string {
  const selected = blocks
    .filter((b) => b.selected)
    .sort((a, b) => a.order - b.order);

  if (selected.length === 0) {
    return "";
  }

  const provider = selected[0].sourceProviderId ?? "sample";
  const now = new Date().toISOString().replace(/\.\d+Z$/, "");

  const header = `---\nsource: Response Clipper\ncreated_at: ${now}\nprovider: ${provider}\n---`;

  const body = selected.map((b) => b.markdown).join("\n\n");

  return `${header}\n\n${body}`;
}
