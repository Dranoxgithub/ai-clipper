# Response Clipper

A VS Code / Kiro / Cursor extension for saving AI assistant responses directly to your notes.

## Current Features (v0.1)

- Paste any AI response into the panel
- Optional file name field
- Save to `.ai-clips/` in your current workspace
- Save directly to your Obsidian vault
- Secret detection warning before saving

## Configuration

| Setting | Description |
|---|---|
| `responseClipper.obsidianPath` | Default Obsidian vault path, e.g. `~/Documents/Obsidian/MyVault` |

Set via `Cmd+,` → search `responseClipper`.

## Usage

1. Copy a message from Kiro/Cursor/ChatGPT
2. Paste into the Response Clipper panel
3. Optionally type a short file name
4. Hit **Save to .ai-clips** or **Save to Obsidian**

---

## Roadmap

### Phase 2 — Search & Browse
- Search saved clips within the sidebar panel
- Edit clips inline before saving

### Phase 3 — AI Titling & Synthesis
- Connect to a local LM (Ollama / LM Studio) or online API (OpenAI, Anthropic)
  to auto-suggest clip titles
- Resümmarize and synthesize a clip with existing Obsidian notes
- Configurable: choose local model or API key, opt out entirely

### Phase 4 — Per-workspace Obsidian Path
- Configure a different Obsidian vault folder per workspace
- Workspace-level setting overrides the global default
- Quick-pick to choose destination vault when multiple are configured

---

## Development

```bash
cd response-clipper
npm install
npm run compile   # build
npm test          # run unit tests
npm run package   # produce .vsix
```
## For use 

```bash 
git clone https://github.com/Dranoxgithub/ai-clipper.git
cd ai-clipper/response-clipper
npm install
npm run package
```
Then install the .vsix via Cmd+Shift+P → Extensions: Install from VSIX....