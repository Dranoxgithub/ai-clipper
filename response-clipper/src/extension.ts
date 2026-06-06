import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { getWebviewHtml } from "./webview/getWebviewHtml";
import { exportSelectedBlocks } from "./markdown/exportMarkdown";
import { scanForSecrets } from "./markdown/secretScan";
import type { SelectableBlock } from "./types";

type FromWebviewMessage =
  | { type: "ready" }
  | { type: "copySelected"; blocks: SelectableBlock[] }
  | { type: "saveSelected"; blocks: SelectableBlock[] }
  | { type: "saveToObsidian"; blocks: SelectableBlock[] };

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ResponseClipperViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("responseClipper.sidebar", provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("responseClipper.open", () => {
      vscode.commands.executeCommand("responseClipper.sidebar.focus");
    })
  );
}

export function deactivate(): void {}

class ResponseClipperViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri);
    webviewView.webview.onDidReceiveMessage(async (msg: FromWebviewMessage) => {
      switch (msg.type) {
        case "ready": break;
        case "copySelected": await this._handleCopy(msg.blocks); break;
        case "saveSelected": await this._handleSave(msg.blocks); break;
        case "saveToObsidian": await this._handleSaveToObsidian(msg.blocks); break;
      }
    });
  }

  private async _handleCopy(selected: SelectableBlock[]): Promise<void> {
    if (selected.length === 0) { this._post({ type: "info", message: "No blocks selected." }); return; }
    const markdown = exportSelectedBlocks(selected.map((b) => ({ ...b, selected: true })));
    if (await this._confirmIfSecrets(markdown)) { return; }
    await vscode.env.clipboard.writeText(markdown);
    this._post({ type: "info", message: "Copied to clipboard." });
  }

  private async _handleSave(selected: SelectableBlock[]): Promise<void> {
    if (selected.length === 0) { this._post({ type: "info", message: "No blocks selected." }); return; }
    const wf = vscode.workspace.workspaceFolders;
    if (!wf || wf.length === 0) { this._post({ type: "error", message: "No workspace open. Use Copy Markdown." }); return; }
    const markdown = exportSelectedBlocks(selected.map((b) => ({ ...b, selected: true })));
    if (await this._confirmIfSecrets(markdown)) { return; }
    const clipsDir = path.join(wf[0].uri.fsPath, ".ai-clips");
    if (!fs.existsSync(clipsDir)) { fs.mkdirSync(clipsDir, { recursive: true }); }
    const filename = this._timestamp() + "-response-clip.md";
    fs.writeFileSync(path.join(clipsDir, filename), markdown, "utf8");
    vscode.window.showInformationMessage("Saved to .ai-clips/" + filename);
    this._post({ type: "info", message: "Saved to .ai-clips/" + filename });
  }

  private async _handleSaveToObsidian(selected: SelectableBlock[]): Promise<void> {
    if (selected.length === 0) { this._post({ type: "info", message: "No blocks selected." }); return; }
    const config = vscode.workspace.getConfiguration("responseClipper");
    const obsidianPath: string = config.get("obsidianPath") || "";
    if (!obsidianPath) { this._post({ type: "error", message: "Set responseClipper.obsidianPath in settings first." }); return; }
    const expanded = obsidianPath.replace(/^~/, process.env.HOME || "");
    if (!fs.existsSync(expanded)) { this._post({ type: "error", message: "Obsidian path not found: " + expanded }); return; }
    const markdown = exportSelectedBlocks(selected.map((b) => ({ ...b, selected: true })));
    if (await this._confirmIfSecrets(markdown)) { return; }
    const filename = this._timestamp() + "-response-clip.md";
    fs.writeFileSync(path.join(expanded, filename), markdown, "utf8");
    vscode.window.showInformationMessage("Saved to Obsidian: " + filename);
    this._post({ type: "info", message: "Saved to Obsidian: " + filename });
  }

  private async _confirmIfSecrets(markdown: string): Promise<boolean> {
    const scan = scanForSecrets(markdown);
    if (!scan.hasSecrets) { return false; }
    const choice = await vscode.window.showWarningMessage(
      "Selected text may contain secrets. Continue export?", "Continue", "Cancel"
    );
    if (choice !== "Continue") { this._post({ type: "info", message: "Export cancelled." }); return true; }
    return false;
  }

  private _timestamp(): string {
    return new Date().toISOString().replace(/T/, "-").replace(/:/g, "").replace(/\.\d+Z$/, "");
  }

  private _post(msg: object): void { this._view?.webview.postMessage(msg); }
}
