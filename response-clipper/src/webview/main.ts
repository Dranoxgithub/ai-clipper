// Webview client script — runs inside the webview context (no vscode API here)
// Types inlined to avoid module imports (compiled with module: None for browser)

type ChatProviderId = "sample" | "cursor" | "kiro";

type SelectableBlockKind =
  | "heading" | "paragraph" | "list_item" | "code"
  | "math" | "table" | "quote" | "thematic_break" | "unknown";

type SelectableBlock = {
  id: string;
  kind: SelectableBlockKind;
  markdown: string;
  plainText: string;
  selected: boolean;
  order: number;
  sourceProviderId?: ChatProviderId;
};

type FromWebviewMessage =
  | { type: "ready" }
  | { type: "copySelected"; blocks: SelectableBlock[] }
  | { type: "saveSelected"; blocks: SelectableBlock[] }
  | { type: "saveToObsidian"; blocks: SelectableBlock[] };

type ToWebviewMessage =
  | { type: "info"; message: string }
  | { type: "error"; message: string };

// @ts-ignore
const vscode = acquireVsCodeApi();

let blocks: SelectableBlock[] = [];
let idCounter = 0;

function nextId(): string { return `b-${++idCounter}`; }

function post(msg: FromWebviewMessage): void { vscode.postMessage(msg); }

function setStatus(text: string, isError = false): void {
  const el = document.getElementById("status")!;
  el.textContent = text;
  el.className = "status" + (isError ? " error" : "");
}

// ── Inline block parser (mirrors splitIntoBlocks.ts) ─────────────────────────
function parseBlocks(markdown: string): SelectableBlock[] {
  const result: SelectableBlock[] = [];
  const lines = markdown.split("\n");
  let i = 0;
  let order = 0;

  function push(kind: SelectableBlockKind, md: string): void {
    const trimmed = md.trim();
    if (!trimmed) { return; }
    result.push({ id: nextId(), kind, markdown: trimmed, plainText: trimmed.replace(/[#`$*_~|]/g, "").trim(), selected: false, order: order++ });
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const fence = (line.trim().match(/^(`{3,})/)?.[1]) ?? "```";
      const collected = [line]; i++;
      while (i < lines.length) { collected.push(lines[i]); if (lines[i].trim() === fence) { i++; break; } i++; }
      push("code", collected.join("\n")); continue;
    }

    // Display math block
    if (line.trim() === "$") {
      const collected = [line]; i++;
      while (i < lines.length) { collected.push(lines[i]); if (lines[i].trim() === "$") { i++; break; } i++; }
      push("math", collected.join("\n")); continue;
    }

    // Heading
    if (/^#{1,6}\s/.test(line.trim())) { push("heading", line); i++; continue; }

    // Thematic break
    if (/^(---+|\*\*\*+|___+)\s*$/.test(line.trim())) { push("thematic_break", line); i++; continue; }

    // List item
    if (/^[-*+]\s/.test(line.trim()) || /^\d+\.\s/.test(line.trim())) {
      const collected = [line]; i++;
      while (i < lines.length && /^[ \t]+\S/.test(lines[i])) { collected.push(lines[i]); i++; }
      push("list_item", collected.join("\n")); continue;
    }

    // Blockquote
    if (/^>\s?/.test(line.trim())) {
      const collected = [line]; i++;
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { collected.push(lines[i]); i++; }
      push("quote", collected.join("\n")); continue;
    }

    // Table
    if (/^\|/.test(line.trim())) {
      const collected = [line]; i++;
      while (i < lines.length && /^\|/.test(lines[i].trim())) { collected.push(lines[i]); i++; }
      push("table", collected.join("\n")); continue;
    }

    // Paragraph
    const collected = [line]; i++;
    while (i < lines.length) {
      const next = lines[i];
      if (next.trim() === "" || /^#{1,6}\s/.test(next.trim()) || /^```/.test(next.trim()) ||
          next.trim() === "$" || /^[-*+]\s/.test(next.trim()) || /^\d+\.\s/.test(next.trim()) ||
          /^>\s?/.test(next.trim()) || /^\|/.test(next.trim()) || /^(---+|\*\*\*+|___+)\s*$/.test(next.trim())) { break; }
      collected.push(next); i++;
    }
    push("paragraph", collected.join("\n"));
  }

  return result;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderBlocks(): void {
  const container = document.getElementById("blocks-list")!;
  if (blocks.length === 0) {
    container.innerHTML = '<div class="empty">Paste a response above to start clipping.</div>';
    return;
  }
  container.innerHTML = "";
  blocks.forEach((block) => {
    const row = document.createElement("div");
    row.className = "block-row" + (block.selected ? " selected" : "");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = block.selected;
    cb.addEventListener("change", () => { toggleBlock(block.id, cb.checked); });

    const content = document.createElement("div");
    content.className = "block-content";

    const kindLabel = document.createElement("div");
    kindLabel.className = "block-kind";
    kindLabel.textContent = block.kind.replace("_", " ");

    const text = document.createElement("pre");
    text.className = `block-text ${block.kind}`;
    text.textContent = block.markdown;

    content.appendChild(kindLabel);
    content.appendChild(text);
    row.appendChild(cb);
    row.appendChild(content);

    row.addEventListener("click", (e) => {
      if (e.target !== cb) { cb.checked = !cb.checked; toggleBlock(block.id, cb.checked); }
    });

    container.appendChild(row);
  });
}

function toggleBlock(id: string, selected: boolean): void {
  blocks = blocks.map((b) => b.id === id ? { ...b, selected } : b);
  renderBlocks();
}

function selectByKind(kind: string | null): void {
  blocks = blocks.map((b) => ({ ...b, selected: kind === null ? false : kind === "all" ? true : b.kind === kind }));
  renderBlocks();
}

// ── Textarea live input ───────────────────────────────────────────────────────
const inputArea = document.getElementById("input-area") as HTMLTextAreaElement;
let parseTimer: ReturnType<typeof setTimeout> | null = null;

inputArea.addEventListener("input", () => {
  if (parseTimer) { clearTimeout(parseTimer); }
  parseTimer = setTimeout(() => {
    idCounter = 0;
    blocks = parseBlocks(inputArea.value);
    renderBlocks();
    if (blocks.length > 0) { setStatus(`${blocks.length} blocks. Select and export.`); }
    else { setStatus(""); }
  }, 300);
});

// ── Button wiring ─────────────────────────────────────────────────────────────
document.getElementById("btn-select-all")!.addEventListener("click", () => selectByKind("all"));
document.getElementById("btn-select-none")!.addEventListener("click", () => selectByKind(null));
document.getElementById("btn-select-math")!.addEventListener("click", () => selectByKind("math"));
document.getElementById("btn-select-code")!.addEventListener("click", () => selectByKind("code"));

document.getElementById("btn-copy")!.addEventListener("click", () => {
  const selected = blocks.filter((b) => b.selected);
  if (selected.length === 0) { setStatus("No blocks selected.", true); return; }
  post({ type: "copySelected", blocks: selected });
});

document.getElementById("btn-save")!.addEventListener("click", () => {
  const selected = blocks.filter((b) => b.selected);
  if (selected.length === 0) { setStatus("No blocks selected.", true); return; }
  post({ type: "saveSelected", blocks: selected });
});

document.getElementById("btn-obsidian")!.addEventListener("click", () => {
  const selected = blocks.filter((b) => b.selected);
  if (selected.length === 0) { setStatus("No blocks selected.", true); return; }
  post({ type: "saveToObsidian", blocks: selected });
});

// ── Messages from extension ───────────────────────────────────────────────────
window.addEventListener("message", (event) => {
  const msg = event.data as ToWebviewMessage;
  if (msg.type === "info") { setStatus(msg.message); }
  else if (msg.type === "error") { setStatus(msg.message, true); }
});

post({ type: "ready" });
