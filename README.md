# Persona Helper

Persona Helper is a Marinara Engine personal extension for turning player intent into story-facing goals and action hints.

This is the plain JavaScript boilerplate for the extension. It sits between the small Hello World sample and the larger Story Manager structure: React for the extension shell, direct same-origin access through `full_page_access`, and separate folders for API helpers, reusable components, views, styles, and build scripts.

## Current Shape

- **Goals**: persona-scoped collections and goal cards, currently backed by local extension storage until the Persona Helper backend commands are implemented.
- **Actions**: a fast hint form with intention, approach, and notes fields. The initial scaffold prepares the UI and payload shape but does not call an LLM yet.
- **Settings**: backend port and fallback options for the future command endpoint.

## Source Layout

| Path | Role |
| --- | --- |
| `src/main.jsx` | Extension entry point |
| `src/Views/DrawerView.jsx` | Drawer shell, rail navigation, top tabs |
| `src/Views/GoalsView.jsx` | Goal collection and goal-card starter view |
| `src/Views/ActionsView.jsx` | Action hint starter view |
| `src/Views/SettingsView.jsx` | Backend and extension preferences |
| `src/API/` | Backend, Marinara, settings, and local goal helpers |
| `src/Components/` | Reusable controls and layout pieces |
| `src/Styles/` | Inline style constants plus injected drawer CSS |
| `scripts/check-bundle-size.mjs` | Bundle text-entry limit guard |

## Development

Install dependencies:

```sh
pnpm install
```

Build:

```sh
pnpm build
```

Package:

```sh
pnpm zip
```

The package is written to:

```text
dist/persona-helper.personal-extension.zip
```

To iterate with live rebuilds:

```sh
pnpm build:watch
```

Run `pnpm zip` manually after each build when you need a new importable package.

## Build Size

Marinara currently allows a package zip up to 32 MB, individual text entries up to 2 MB uncompressed, and total extracted text content up to 16 MB. The build script checks `dist/persona-helper.js` against the 2 MB text-entry limit.

Current bundle size after the boilerplate pass is:

```text
220673 bytes, 10.5% of 2097152
```

## Installation

1. Set `ENABLE_EXTERNAL_EXTENSIONS=true` in Marinara Engine `.env`.
2. Restart Marinara.
3. In Marinara, enable **Settings -> Advanced -> Allow third-party extension imports**.
4. Import `dist/persona-helper.personal-extension.zip` from **Addons -> External Extensions**.
5. Enable Persona Helper and approve the exact hash.

The zip is built with `zip -j`, so `persona-helper.js` and `manifest.json` live at the zip root. The manifest `jsPath` must remain:

```json
"jsPath": "persona-helper.js"
```

## Security

This extension requests `full_page_access`, so it runs with the same practical authority as browser-console code on the Marinara origin. It can access DOM, local storage, and same-origin APIs. Only install builds you trust.
