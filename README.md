# Persona Helper

Persona Helper is a Marinara Engine personal extension for turning player intent into story-facing goals and action hints.

It uses a React drawer shell with same-origin access through `full_page_access`, Marinara APIs for chat, character, lorebook, prompt, and generation context, and the Persona Helper backend on port `5003` for persistent goal storage.

## Current Shape

- **Goals**: subject-scoped goal libraries, chat assignment, focused milestone navigation, directive progress tracking, React Flow maps, prompt-backed directive generation, lorebook context, debug panels, duplication, cleanup, and delete flows.
- **Actions**: prompt-backed action hint generation with intention, approach, notes, lorebook context, recent hint backlog, prompt preview, raw generation output, and generation settings.
- **Settings**: backend port, Marinara generation connection preferences, fallback behavior, shared model parameters, and extension/about details.

## Concepts

Persona Helper treats long-running intent as a goal tree:

- **Goals** are durable backend records scoped to a subject namespace.
- **Milestones** are focused outcomes inside a goal tree.
- **Directives** are actions, requirements, opportunities, cautions, or constraints that move toward or away from a milestone.
- **Subjects** can be personas, characters, or the `_extras` namespace for minor/throwaway characters.

Goals are assigned to the current chat through backend chat bindings. The extension uses Marinara context when available, but also provides subject pickers because Marinara may not always expose the current persona or character list in a usable form.

## Generation

Actions and Goals both use prompt contracts from the Persona Helper backend prompt domain.

Action hint generation expects prompts with:

```text
intention
approach
```

Directive generation expects prompts with:

```text
milestone
```

Generation validates the selected prompt before each run. Goals directive generation only creates reviewable candidates under the currently focused milestone or directive. Candidates are editable in a modal, can be regenerated, and are only added to the backend after the user confirms selected rows.

## Source Layout

| Path | Role |
| --- | --- |
| `src/main.jsx` | Extension entry point |
| `src/Views/DrawerView.jsx` | Drawer shell, rail navigation, top tabs |
| `src/Views/GoalsView.jsx` | Goals library, milestone view, setup/debug, generation, and about panels |
| `src/Views/ActionsView.jsx` | Action hint composer, prompt setup, recent hints, and about panels |
| `src/Views/SettingsView.jsx` | Backend and extension preferences |
| `src/API/` | Persona backend, Marinara, prompt, extraction, lorebook, and settings helpers |
| `src/Components/` | Reusable controls, snackbar, modal, and layout pieces |
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

Current bundle size is:

```text
580781 bytes, 27.7% of 2097152
```

The exact value may move slightly after each build.

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
