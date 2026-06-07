// Webview client script — no vscode module imports, compiled with module: None

type FromWebviewMessage =
  | { type: "ready" }
  | { type: "saveSelected"; text: string; filename: string }
  | { type: "saveToObsidian"; text: string; filename: string };

type ToWebviewMessage =
  | { type: "info"; message: string }
  | { type: "error"; message: string };

// @ts-ignore
const vscode = acquireVsCodeApi();

function post(msg: FromWebviewMessage): void { vscode.postMessage(msg); }

function setStatus(text: string, isError = false): void {
  const el = document.getElementById("status")!;
  el.textContent = text;
  el.className = "status" + (isError ? " error" : "");
}

function getContent(): string {
  return (document.getElementById("input-area") as HTMLTextAreaElement).value.trim();
}

function getFilename(): string {
  return (document.getElementById("filename-input") as HTMLInputElement).value.trim();
}

document.getElementById("btn-save")!.addEventListener("click", () => {
  const text = getContent();
  if (!text) { setStatus("Nothing to save.", true); return; }
  post({ type: "saveSelected", text, filename: getFilename() });
});

document.getElementById("btn-obsidian")!.addEventListener("click", () => {
  const text = getContent();
  if (!text) { setStatus("Nothing to save.", true); return; }
  post({ type: "saveToObsidian", text, filename: getFilename() });
});

window.addEventListener("message", (event) => {
  const msg = event.data as ToWebviewMessage;
  if (msg.type === "info") {
    setStatus(msg.message);
    if (msg.message.startsWith("Saved")) {
      (document.getElementById("input-area") as HTMLTextAreaElement).value = "";
    }
  } else if (msg.type === "error") {
    setStatus(msg.message, true);
  }
});

post({ type: "ready" });
