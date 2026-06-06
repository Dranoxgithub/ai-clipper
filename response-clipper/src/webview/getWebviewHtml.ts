import * as vscode from "vscode";

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const stylesUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "styles.css")
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "webview", "main.js")
  );

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline';
             script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${stylesUri}" />
  <title>Response Clipper</title>
</head>
<body>
  <h2>Response Clipper</h2>

  <div class="source-row">
    <button id="btn-clip-clipboard" class="primary" style="width:100%">📋 Clip from Clipboard</button>
  </div>

  <div id="blocks-list" class="blocks-list">
    <div class="empty">Loading…</div>
  </div>

  <div class="divider"></div>

  <div class="actions-row" id="filter-actions">
    <button id="btn-select-all">Select All</button>
    <button id="btn-select-none">Select None</button>
    <button id="btn-select-math">Select Math</button>
    <button id="btn-select-code">Select Code</button>
  </div>

  <div class="actions-row">
    <button id="btn-copy" class="primary">Copy Markdown</button>
    <button id="btn-save" class="primary">Save to .ai-clips</button>
    <button id="btn-obsidian" class="primary">Save to Obsidian</button>
  </div>

  <div id="status" class="status"></div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
