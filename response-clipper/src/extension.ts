import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { getWebviewHtml } from "./webview/getWebviewHtml";
import { splitIntoBlocks } from "./markdown/splitIntoBlocks";
import { exportSelectedBlocks } from "./markdown/exportMarkdown";
import { scanForSecrets } from "./markdown/secretScan";
import type { SelectableBlock } from "./types";

type FromWebviewMessage =
  | { type: "ready" }
  | { type: "clipFromClipboard" }
  | { type: "copySelected"; blocks: SelectableBlock[] }
  | { type: "saveSelected"; blocks: SelectableBlock[] }
  | { type: "saveToObsidian"; blocks: SelectableBlock[] }
  | { type: "refresh" };

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

  context.subscriptions.push(
    vscode.commands.registerCommand("responseClipper.refresh", () => {
      provider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("responseClipper.copySelectedMarkdown", () => {
      provider.copySelected();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("responseClipper.saveSelectedMarkdown", () => {
      provider.saveSelected();
    })
  );
}

export function deactivate(): void {}

class ResponseClipperViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _currentBlocks: SelectableBlock[] = [];

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
        case "ready":
          // Show empty state — user clicks "Clip from Clipboard" to load
          this._post({ type: "blocksLoaded", blocks: [] });
          break;

        case "clipFromClipboard":
          await this._handleClipFromClipboard();
          break;

        case "copySelected":
          await this._handleCopy(msg.blocks);
          break;

        case "saveSelected":
          await this._handleSave(msg.blocks);
          break;

        case "saveToObsidian":
          await this._handleSaveToObsidian(msg.blocks);
          break;

        case "refresh":
          this._post({ type: "blocksLoaded", blocks: this._currentBlocks });
          break;
      }
    });
  }

  refresh(): void {
    if (this._view) {
      this._post({ type: "blocksLoaded", blocks: this._currentBlocks });
    }
  }

  copySelected(): void {
    const selected = this._currentBlocks.filter((b) => b.selected);
    this._handleCopy(selected);
  }

  saveSelected(): void {
    const selected = this._currentBlocks.filter((b) => b.selected);
    this._handleSave(selected);
  }

  private async _handleCopy(selected: SelectableBlock[]): Promise<void> {
    if (selected.length === 0) {
      this._post({ type: "info", message: "No blocks selected." });
      return;
    }

    const allBlocks = this._currentBlocks.map((b) => ({
      ...b,
      selected: selected.some((s) => s.id === b.id),
    }));

    const markdown = exportSelectedBlocks(allBlocks);

    const scan = scanForSecrets(markdown);
    if (scan.hasSecrets) {
      const choice = await vscode.window.showWarningMessage(
        "Selected text may contain secrets. Continue export?",
        "Continue",
        "Cancel"
      );
      if (choice !== "Continue") {
        this._post({ type: "info", message: "Export cancelled." });
        return;
      }
    }

    await vscode.env.clipboard.writeText(markdown);
    this._post({ type: "info", message: "Copied selected blocks to clipboard." });
  }

  private async _handleSave(selected: SelectableBlock[]): Promise<void> {
    if (selected.length === 0) {
      this._post({ type: "info", message: "No blocks selected." });
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage(
        "No workspace open. Use Copy Markdown instead."
      );
      this._post({ type: "error", message: "No workspace open. Use Copy Markdown." });
      return;
    }

    const allBlocks = this._currentBlocks.map((b) => ({
      ...b,
      selected: selected.some((s) => s.id === b.id),
    }));

    const markdown = exportSelectedBlocks(allBlocks);

    const scan = scanForSecrets(markdown);
    if (scan.hasSecrets) {
      const choice = await vscode.window.showWarningMessage(
        "Selected text may contain secrets. Continue export?",
        "Continue",
        "Cancel"
      );
      if (choice !== "Continue") {
        this._post({ type: "info", message: "Export cancelled." });
        return;
      }
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const clipsDir = path.join(workspaceRoot, ".ai-clips");

    if (!fs.existsSync(clipsDir)) {
      fs.mkdirSync(clipsDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/T/, "-")
      .replace(/:/g, "")
      .replace(/\.\d+Z$/, "");
    const filename = `${timestamp}-response-clip.md`;
    const filePath = path.join(clipsDir, filename);

    fs.writeFileSync(filePath, markdown, "utf8");

    vscode.window.showInformationMessage(`Saved to .ai-clips/${filename}`);
    this._post({ type: "info", message: `Saved to .ai-clips/${filename}` });
  }

  private async _handleClipFromClipboard(): Promise<void> {
    const text = await vscode.env.clipboard.readText();
    if (!text.trim()) {
      this._post({ type: "error", message: "Clipboard is empty." });
      return;
    }
    const rawBlocks = splitIntoBlocks(text);
    const blocks: SelectableBlock[] = rawBlocks.map((b) => ({
      ...b,
      sourceProviderId: "sample" as const,
    }));
    this._currentBlocks = blocks;
    this._post({ type: "blocksLoaded", blocks });
    this._post({ type: "info", message: `Parsed ${blocks.length} blocks from clipboard.` });
  }

  private async _handleSaveToObsidian(selected: SelectableBlock[]): Promise<void> {
    if (selected.length === 0) {
      this._post({ type: "info", message: "No blocks selected." });
      return;
    }

    const config = vscode.workspace.getConfiguration("responseClipper");
    const obsidianPath: string = config.get("obsidianPath") || "";

    if (!obsidianPath) {
      vscode.window.showErrorMessage(
        "No Obsidian path configured. Set responseClipper.obsidianPath in settings."
      );
      this._post({ type: "error", message: "Set responseClipper.obsidianPath in settings first." });
      return;
    }

    const expanded = obsidianPath.replace(/^~/, process.env.HOME || "");
    if (!fs.existsSync(expanded)) {
      vscode.window.showErrorMessage(`Obsidian path not found: ${expanded}`);
      this._post({ type: "error", message: `Path not found: ${expanded}` });
      return;
    }

    const allBlocks = this._currentBlocks.map((b) => ({
      ...b,
      selected: selected.some((s) => s.id === b.id),
    }));

    const markdown = exportSelectedBlocks(allBlocks);

    const scan = scanForSecrets(markdown);
    if (scan.hasSecrets) {
      const choice = await vscode.window.showWarningMessage(
        "Selected text may contain secrets. Continue export?",
        "Continue", "Cancel"
      );
      if (choice !== "Continue") {
        this._post({ type: "info", message: "Export cancelled." });
        return;
      }
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/T/, "-")
      .replace(/:/g, "")
      .replace(/\.\d+Z$/, "");
    const filename = `${timestamp}-response-clip.md`;
    const filePath = path.join(expanded, filename);

    fs.writeFileSync(filePath, markdown, "utf8");
    vscode.window.showInformationMessage(`Saved to Obsidian: ${filename}`);
    this._post({ type: "info", message: `Saved to Obsidian: ${filename}` });
  }

  private _post(msg: object): void {
    this._view?.webview.postMessage(msg);
  }
}
