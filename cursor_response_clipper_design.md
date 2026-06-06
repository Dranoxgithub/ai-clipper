# Response Clipper — MVP Design Doc

## Goal

Build a local IDE extension that lets the user clip selected parts of a single AI assistant response.

The key requirement is **fine-grained selection inside one assistant response**. The extension should split one response into selectable blocks/rows such as paragraphs, bullets, code blocks, math blocks, headings, and tables. The user can check specific blocks and export only those selected snippets as Markdown.

This is not just conversation export. This is **response-level clipping**.

The first target IDE is **Cursor**, but the architecture must be easy to extend to **Kiro** or other VS Code-like AI coding interfaces later.

## Product Summary

Name: `Response Clipper`

MVP user flow:

1. User opens Cursor.
2. User opens the extension sidebar: `Response Clipper`.
3. For MVP, the sidebar shows a hardcoded sample assistant response.
4. The response is split into semantic Markdown blocks.
5. Each block is rendered with a checkbox.
6. User selects blocks.
7. User can:
   - Copy selected blocks as Markdown.
   - Save selected blocks to `.ai-clips/<timestamp>-clip.md`.

Later phases can read real Cursor or Kiro local chat history, but MVP should first prove the clipping UI and export behavior.

## Non-goals for MVP

Do not implement these in the first version:

- Do not inject UI directly into Cursor’s native Agent panel.
- Do not inject UI directly into Kiro’s native chat/spec panel.
- Do not rely on private DOM hooks.
- Do not build cloud sync.
- Do not build share links.
- Do not build PDF export.
- Do not implement Cursor DB reading yet.
- Do not implement Kiro history reading yet.
- Do not send chat/code content to any external API.

MVP should be local-only.

## Why Sidebar Instead of Native Chat UI Injection

Cursor and Kiro AI panels may not expose stable public APIs for modifying their native chat UIs. Injecting checkboxes directly into the native chat panel is fragile and likely to break after IDE updates.

Instead, build a VS Code-compatible extension sidebar using a Webview. The extension re-renders the response inside its own UI. This is much more stable.

The extension should separate:

1. **Provider layer**: where conversations/responses come from, such as hardcoded sample, Cursor local history, Kiro local history.
2. **Core clipping layer**: Markdown block splitting, selection, export.
3. **UI layer**: Webview sidebar.

This separation makes the solution easier to extend from Cursor to Kiro later.

## Target UX

Sidebar layout:

```text
Response Clipper
────────────────────────

Source:
[ Sample Response v ]

Selected Response

[ ] Heading:
    ## Why this matters

[ ] Paragraph:
    对，MLA 里的 RoPE 分支实际上是：

[ ] Math:
    $$
    W_{\text{up}} \cdot \operatorname{RoPE}(c)
    \ne
    \operatorname{RoPE}(W_{\text{up}}c)
    $$

[ ] Paragraph:
    这是个非常重要的区别。

[ ] Code:
    ```ts
    type Message = {
      id: string;
      text: string;
    };
    ```

Actions:
[ Select All ] [ Select None ] [ Select Math ] [ Select Code ]
[ Copy Markdown ] [ Save to .ai-clips ]
```

## Functional Requirements

### 1. Extension Activation

Create a VS Code/Cursor-compatible extension.

Commands:

- `responseClipper.open`
- `responseClipper.refresh`
- `responseClipper.copySelectedMarkdown`
- `responseClipper.saveSelectedMarkdown`

Contributions:

- Add a sidebar view called `Response Clipper`.
- Add command palette command: `Open Response Clipper`.

### 2. MVP Data Source

For MVP, do not read Cursor or Kiro history yet.

Use a hardcoded sample assistant response that includes:

- Chinese/English paragraph text
- Display math block
- Bullet list
- Fenced code block
- Heading
- Markdown table

Example sample response:

````md
## Why this matters

对，这个区别很重要。

如果先在 latent 上做：

$$
\operatorname{RoPE}(c)
$$

然后再乘：

$$
W_{\text{up}}
$$

那么：

$$
W_{\text{up}} \cdot \operatorname{RoPE}(c)
\ne
\operatorname{RoPE}(W_{\text{up}} c)
$$

原因：

- RoPE operates on paired dimensions.
- Projection changes the basis.
- Arbitrary projection generally does not commute with RoPE.

```ts
type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};
```

| Concept | Meaning |
|---|---|
| RoPE | Rotation in paired dimensions |
| Projection | Basis-changing linear map |
````

### 3. Provider-Abstraction Requirement

Even though MVP uses a hardcoded sample response, the implementation must introduce a provider interface so Cursor and Kiro can be added later without rewriting the UI or Markdown logic.

Create a provider interface like this:

```ts
export type ChatProviderId = "sample" | "cursor" | "kiro";

export type ChatProvider = {
  id: ChatProviderId;
  displayName: string;
  isAvailable(): Promise<boolean>;
  listConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<Conversation | undefined>;
};
```

MVP should implement only:

```text
src/providers/sampleProvider.ts
```

Future phases can add:

```text
src/providers/cursorProvider.ts
src/providers/kiroProvider.ts
```

The Webview and clipping logic should consume `Conversation`, `Message`, and `SelectableBlock` only. It should not know whether the source is Cursor, Kiro, or sample data.

### 4. Internal Types

Use these TypeScript types:

```ts
export type ChatRole = "user" | "assistant" | "tool" | "system" | "unknown";

export type Conversation = {
  id: string;
  title: string;
  providerId: ChatProviderId;
  workspacePath?: string;
  createdAt?: number;
  updatedAt?: number;
  messages: Message[];
  raw?: unknown;
};

export type Message = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt?: number;
  raw?: unknown;
};

export type SelectableBlockKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "code"
  | "math"
  | "table"
  | "quote"
  | "thematic_break"
  | "unknown";

export type SelectableBlock = {
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
```

### 5. Markdown Block Parser

Create:

```text
src/markdown/splitIntoBlocks.ts
```

Function:

```ts
export function splitIntoBlocks(markdown: string): SelectableBlock[];
```

Block splitting rules:

1. Fenced code block stays as one block.

Example:

````md
```ts
const x = 1;
console.log(x);
```
````

2. Display math block stays as one block.

Example:

```md
$$
W_{\text{up}} \cdot \operatorname{RoPE}(c)
$$
```

3. Heading is one block.

Example:

```md
## Why this matters
```

4. Each bullet/list item is one block.

Example:

```md
- item one
- item two
```

Should become two `list_item` blocks.

5. Paragraphs are separated by blank lines.

6. Markdown tables stay as one block.

7. Blockquotes can stay together as one block.

Important: Do not split by visual line wrapping. Split by Markdown semantic block. Visual rows change with window width.

A custom lightweight scanner is acceptable for MVP. No need to use a full Markdown AST parser unless easy.

### 6. Webview UI

Create a Webview sidebar UI.

Minimal files:

```text
src/webview/
  getWebviewHtml.ts
  main.ts
  styles.css
```

React is optional. Plain TypeScript/HTML is fine for MVP.

UI features:

- Render the selected assistant response as selectable blocks.
- Each block has a checkbox.
- Show block kind label, such as `paragraph`, `math`, `code`.
- Preserve Markdown formatting in display enough to be readable.
- Code/math blocks can be rendered as `<pre>`.
- Buttons:
  - Select All
  - Select None
  - Select Math
  - Select Code
  - Copy Markdown
  - Save Markdown

Checkbox behavior:

- Clicking checkbox toggles block selection.
- Selected blocks are tracked in Webview state.
- Export preserves original block order.

### 7. Markdown Export

Create:

```text
src/markdown/exportMarkdown.ts
```

Function:

```ts
export function exportSelectedBlocks(blocks: SelectableBlock[]): string;
```

Behavior:

- Include only selected blocks.
- Preserve original order.
- Join blocks with two newlines.
- Preserve fenced code blocks.
- Preserve display math blocks.
- Add optional metadata header.

Example output:

```md
---
source: Response Clipper
created_at: 2026-06-06T18:30:12
provider: sample
---

对，这个区别很重要。

$$
W_{\text{up}} \cdot \operatorname{RoPE}(c)
\ne
\operatorname{RoPE}(W_{\text{up}} c)
$$

- RoPE operates on paired dimensions.
- Projection changes the basis.
```

### 8. Copy to Clipboard

Use VS Code API:

```ts
vscode.env.clipboard.writeText(markdown);
```

Show notification:

```text
Copied selected blocks to clipboard.
```

### 9. Save to Workspace

Default save path:

```text
<workspace>/.ai-clips/
```

Filename:

```text
YYYY-MM-DD-HHmmss-response-clip.md
```

Example:

```text
.ai-clips/2026-06-06-183012-response-clip.md
```

If no workspace is open, show an error and tell user to use Copy Markdown instead.

The folder is intentionally named `.ai-clips` instead of `.cursor-clips` so the same extension can support Cursor, Kiro, and other AI coding interfaces.

### 10. Privacy Guard

Before copying or saving, scan selected Markdown for obvious secrets.

Create:

```text
src/markdown/secretScan.ts
```

Detect patterns:

- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCESS_KEY_ID`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `api_key`
- `secret`
- `token`
- `Bearer `
- `-----BEGIN PRIVATE KEY-----`

Behavior:

- If suspicious text is found, show warning:
  - “Selected text may contain secrets. Continue export?”
  - Options: Continue / Cancel
- Do not block export completely.

### 11. Extension-Webview Message Protocol

Webview to extension:

```ts
type FromWebviewMessage =
  | { type: "ready" }
  | { type: "selectProvider"; providerId: ChatProviderId }
  | { type: "selectConversation"; conversationId: string }
  | { type: "selectMessage"; messageId: string }
  | { type: "copySelected"; blocks: SelectableBlock[] }
  | { type: "saveSelected"; blocks: SelectableBlock[] }
  | { type: "refresh" };
```

Extension to Webview:

```ts
type ToWebviewMessage =
  | { type: "providersLoaded"; providers: { id: ChatProviderId; displayName: string; available: boolean }[] }
  | { type: "conversationsLoaded"; conversations: Conversation[] }
  | { type: "blocksLoaded"; blocks: SelectableBlock[] }
  | { type: "info"; message: string }
  | { type: "error"; message: string };
```

### 12. Proposed File Structure

```text
response-clipper/
  package.json
  tsconfig.json
  README.md
  src/
    extension.ts
    types.ts

    providers/
      ChatProvider.ts
      providerRegistry.ts
      sampleProvider.ts
      cursorProvider.ts      # future stub only
      kiroProvider.ts        # future stub only

    markdown/
      splitIntoBlocks.ts
      exportMarkdown.ts
      secretScan.ts

    webview/
      getWebviewHtml.ts
      main.ts
      styles.css

    test/
      splitIntoBlocks.test.ts
      exportMarkdown.test.ts
      secretScan.test.ts
```

MVP should include stubs for Cursor and Kiro providers, but they should return `isAvailable() = false` and not attempt to read real history yet.

Example future provider stub:

```ts
export const kiroProvider: ChatProvider = {
  id: "kiro",
  displayName: "Kiro",
  async isAvailable() {
    return false;
  },
  async listConversations() {
    return [];
  },
  async getConversation() {
    return undefined;
  },
};
```

### 13. Tests

Add unit tests for `splitIntoBlocks`.

Test input:

````md
## Why this matters

对，这个区别很重要。

$$
W_{\text{up}} \cdot \operatorname{RoPE}(c)
\ne
\operatorname{RoPE}(W_{\text{up}} c)
$$

原因：

- RoPE operates on paired dimensions.
- Projection changes the basis.

```ts
type Message = {
  id: string;
  text: string;
}
```
````

Expected block kinds:

```text
heading
paragraph
math
paragraph
list_item
list_item
code
```

Test `exportMarkdown`:

- preserves selected block order
- inserts two newlines between blocks
- preserves code fences
- preserves math fences
- excludes unselected blocks

Test `secretScan`:

- detects `Bearer abc`
- detects `AWS_SECRET_ACCESS_KEY`
- detects private key block
- does not flag normal math text too aggressively

### 14. MVP Acceptance Criteria

MVP is done when:

1. Extension opens inside Cursor/VS Code.
2. Sidebar shows `Response Clipper`.
3. Sample provider is available.
4. Cursor and Kiro providers exist as stubs but are disabled/unavailable.
5. Hardcoded sample response is split into block-level rows.
6. User can check and uncheck rows.
7. User can select all.
8. User can select none.
9. User can select only math blocks.
10. User can select only code blocks.
11. User can copy selected rows as Markdown.
12. User can save selected rows to `.ai-clips/*.md`.
13. Code blocks and math blocks remain intact in exported Markdown.
14. No external network calls are made.

### 15. Future Phase: Cursor History Provider

Do not implement this in MVP, but design should allow it later.

Later, add real implementation to:

```text
src/providers/cursorProvider.ts
```

Likely Cursor DB paths:

macOS:

```bash
~/Library/Application Support/Cursor/User/workspaceStorage/*/state.vscdb
```

Windows:

```bash
%APPDATA%\Cursor\User\workspaceStorage\*\state.vscdb
```

Linux:

```bash
~/.config/Cursor/User/workspaceStorage/*/state.vscdb
```

Later Cursor user flow:

1. Extension scans local Cursor workspace storage.
2. Cursor provider returns conversations.
3. User selects conversation.
4. User selects assistant response.
5. Response is split into selectable blocks.
6. User exports selected blocks.

Cursor DB schema may change, so extraction must be defensive and isolated inside `cursorProvider` or helper modules.

Suggested future modules:

```text
src/providers/cursor/
  findCursorStorage.ts
  readCursorStateDb.ts
  extractCursorConversations.ts
```

### 16. Future Phase: Kiro History Provider

Do not implement this in MVP, but design should allow it later.

Later, add real implementation to:

```text
src/providers/kiroProvider.ts
```

Kiro support should follow the same provider interface. The rest of the app should not change.

Expected future Kiro user flow:

1. Kiro provider discovers local Kiro conversation/spec/agent history.
2. Kiro provider normalizes raw data into `Conversation[]` and `Message[]`.
3. User selects a Kiro conversation/spec session.
4. User selects an assistant response.
5. Response is split into selectable blocks.
6. User exports selected blocks.

Do not assume Kiro storage will match Cursor storage. Keep storage discovery and extraction isolated in Kiro-specific files.

Suggested future modules:

```text
src/providers/kiro/
  findKiroStorage.ts
  readKiroHistory.ts
  extractKiroConversations.ts
```

The UI and Markdown modules should stay provider-agnostic.

### 17. Extension Design Principle for Cursor and Kiro

The extension should follow this dependency direction:

```text
Provider-specific storage readers
        ↓
Normalized Conversation / Message model
        ↓
splitIntoBlocks markdown parser
        ↓
SelectableBlock model
        ↓
Webview UI
        ↓
Markdown export / clipboard / save
```

Provider-specific code should never leak into the Webview UI.

Good:

```ts
const conversations = await provider.listConversations();
```

Bad:

```ts
if (providerId === "cursor") {
  read state.vscdb directly in the UI
}
```

This is the main requirement that makes extension to Kiro easy.

### 18. First Implementation Task

Implement only the MVP.

Do not implement real Cursor DB reading.

Do not implement real Kiro history reading.

Build:

- VS Code/Cursor extension skeleton
- Sidebar webview
- Provider abstraction
- Sample provider with hardcoded sample assistant response
- Cursor provider stub
- Kiro provider stub
- `splitIntoBlocks`
- checkbox block selection
- Copy selected Markdown
- Save selected Markdown to `.ai-clips`
- Basic secret scan warning

The purpose of this first task is to prove the response-level clipping UX works before dealing with Cursor or Kiro local history.

## Agent Prompt

Use this prompt with the coding agent:

```text
Create this as a VS Code/Cursor extension. Implement only the MVP in DESIGN.md.

Important constraints:
- Do not implement real Cursor DB reading yet.
- Do not implement real Kiro history reading yet.
- Add provider abstraction from the start.
- Implement sampleProvider fully.
- Add cursorProvider and kiroProvider as disabled stubs so the design is easy to extend later.
- Keep Markdown parsing/export provider-agnostic.
- No external network calls.
```
