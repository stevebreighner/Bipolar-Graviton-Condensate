# Graviton Theory Decision Tree

Decision-tree app scaffold for the current theory split in the Bipolar Graviton Condensate repo.

## Current branches

- `Graviton status`
  - `Massless branch`: conventional baseline for the current paper.
  - `Massive or extended branch`: includes the core/shell idea.
- `Transfer process`
  - `Option 1`: lean on conventional thinking and treat the condensate as an effective description.
  - `Option 2`: introduce a new transfer field / conversion mechanism.

## Run locally

1. In this folder, run `node server.js`
2. Open `http://127.0.0.1:8787`
3. Keep `Backend` on `Node` if you want save/load to `data/tree-data.json`

## Hosted/static use

- The app works as a static page for viewing, editing in-browser, and exporting.
- `Export SVG`, `Export JPG`, and `Print / PDF` work without the backend.
- `Save to Folder` / `Load Saved` require either the bundled Node server or PHP endpoint.
