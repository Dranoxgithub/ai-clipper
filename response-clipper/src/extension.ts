import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import { getWebviewHtml } from "./webview/getWebviewHtml";
import { scanForSecrets } from "./markdown/secretScan";

type FromWebviewMessage =
  | { type: "ready" }
  | { type: "saveSelected"; text: string; filename: string }
  | { type: "saveToObsidian"; text: string; filename: string };

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
        case "saveSelected": await this._save(msg.text, msg.filename); break;
        case "saveToObsidian": await this._saveToObsidian(msg.text, msg.filename); break;
      }
    });
  }

  private _buildFilename(name: string): string {
    const ts = new Date().toISOString().replace(/T/, "-").replace(/:/g, "").replace(/\.\d+Z$/, "");
    const slug = name ? "-" + name.replace(/[^a-zA-Z0-9_\-]/g, "-").replace(/-+/g, "-") : "";
    return ts + slug + ".md";
  }

  private async _confirmIfSecrets(text: string): Promise<boolean> {
    const scan = scanForSecrets(text);
    if (!scan.hasSecrets) { return false; }
    const choice = await vscode.window.showWarningMessage(
      "Selected text may contain secrets. Continue?", "Continue", "Cancel"
    );
    if (choice !== "Continue") { this._post({ type: "info", message: "Cancelled." }); return true; }
    return false;
  }

  private async _save(text: string, name: string): Promise<void> {
    const wf = vscode.workspace.workspaceFolders;
    if (!wf || wf.length === 0) {
      this._post({ type: "error", message: "No workspace open." });
      return;
    }
    if (await this._confirmIfSecrets(text)) { return; }
    const clipsDir = path.join(wf[0].uri.fsPath, ".ai-clips");
    if (!fs.existsSync(clipsDir)) { fs.mkdirSync(clipsDir, { recursive: true }); }
    const filename = this._buildFilename(name);
    fs.writeFileSync(path.join(clipsDir, filename), text, "utf8");
    vscode.window.showInformationMessage("Saved to .ai-clips/" + filename);
    this._post({ type: "info", message: "Saved to .ai-clips/" + filename });
  }

  private async _saveToObsidian(text: string, name: string): Promise<void> {
    const config = vscode.workspace.getConfiguration("responseClipper");
    const obsidianPath: string = config.get("obsidianPath") || "";
    if (!obsidianPath) {
      this._post({ type: "error", message: "Set responseClipper.obsidianPath in settings first." });
      return;
    }
    const expanded = obsidianPath.replace(/^~/, process.env.HOME || "");
    if (!fs.existsSync(expanded)) {
      this._post({ type: "error", message: "Obsidian path not found: " + expanded });
      return;
    }
    if (await this._confirmIfSecrets(text)) { return; }
    const filename = this._buildFilename(name);
    fs.writeFileSync(path.join(expanded, filename), text, "utf8");
    vscode.window.showInformationMessage("Saved to Obsidian: " + filename);
    this._post({ type: "info", message: "Saved to Obsidian: " + filename });
  }

  private _post(msg: object): void { this._view?.webview.postMessage(msg); }
}
