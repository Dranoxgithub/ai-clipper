# Response Clipper

A VS Code / Cursor extension for clipping selected blocks from AI assistant responses.

## Features

- Splits an assistant response into semantic Markdown blocks (headings, paragraphs, math, code, tables, list items)
- Checkbox per block for fine-grained selection
- Filter buttons: Select All, Select None, Select Math, Select Code
- Copy selected blocks as Markdown to clipboard
- Save selected blocks to `.ai-clips/<timestamp>-response-clip.md`
- Secret detection warning before export
- Provider abstraction (Cursor and Kiro stubs ready for future phases)

## Usage

1. Open the **Response Clipper** panel in the Explorer sidebar.
2. The sample response loads automatically.
3. Check the blocks you want.
4. Click **Copy Markdown** or **Save to .ai-clips**.

## Development

```bash
cd response-clipper
npm install
npm run compile
# Then press F5 in VS Code to launch the Extension Development Host
```

Run tests:

```bash
npm test
```

## Roadmap

- Phase 2: Cursor local history provider (reads `state.vscdb`)
- Phase 3: Kiro history provider
