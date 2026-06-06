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
  sourceConversationId?: string;
  sourceMessageId?: string;
};

type FromWebviewMessage =
  | { type: "ready" }
  | { type: "copySelected"; blocks: SelectableBlock[] }
  | { type: "saveSelected"; blocks: SelectableBlock[] }
  | { type: "saveToObsidian"; blocks: SelectableBlock[] }
  | { type: "clipFromClipboard" }
  | { type: "refresh" };

type ToWebviewMessage =
  | { type: "blocksLoaded"; blocks: SelectableBlock[] }
  | { type: "info"; message: string }
  | { type: "error"; message: string };

// @ts-ignore — acquireVsCodeApi is injected by the webview host
const vscode = acquireVsCodeApi();

let blocks: SelectableBlock[] = [];

function post(msg: FromWebviewMessage): void {
  vscode.postMessage(msg);
}

function setStatus(text: string, isError = false): void {
  const el = document.getElementById("status")!;
  el.textContent = text;
  el.className = "status" + (isError ? " error" : "");
}

function renderBlocks(): void {
  const container = document.getElementById("blocks-list")!;
  if (blocks.length === 0) {
    container.innerHTML = '<div class="empty">No blocks to display.</div>';
    return;
  }

  container.innerHTML = "";
  blocks.forEach((block) => {
    const row = document.createElement("div");
    row.className = "block-row" + (block.selected ? " selected" : "");
    row.dataset.id = block.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = block.selected;
    cb.addEventListener("change", () => toggleBlock(block.id, cb.checked));

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

    // Clicking the row (not just checkbox) also toggles
    row.addEventListener("click", (e) => {
      if (e.target !== cb) {
        cb.checked = !cb.checked;
        toggleBlock(block.id, cb.checked);
      }
    });

    container.appendChild(row);
  });
}

function toggleBlock(id: string, selected: boolean): void {
  blocks = blocks.map((b) => (b.id === id ? { ...b, selected } : b));
  renderBlocks();
}

function selectByKind(kind: string | null): void {
  blocks = blocks.map((b) => ({
    ...b,
    selected: kind === null ? false : kind === "all" ? true : b.kind === kind,
  }));
  renderBlocks();
}

// Wire up buttons
document.getElementById("btn-clip-clipboard")!.addEventListener("click", () => {
  post({ type: "clipFromClipboard" });
  setStatus("Parsing clipboard…");
});

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

// Handle messages from extension
window.addEventListener("message", (event) => {
  const msg = event.data as ToWebviewMessage;

  switch (msg.type) {
    case "blocksLoaded":
      blocks = msg.blocks;
      renderBlocks();
      setStatus(blocks.length > 0 ? `${blocks.length} blocks loaded.` : "No blocks found.");
      break;
    case "info":
      setStatus(msg.message);
      break;
    case "error":
      setStatus(msg.message, true);
      break;
  }
});

// Signal ready
post({ type: "ready" });
