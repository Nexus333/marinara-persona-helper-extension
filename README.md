# Hello World — Marinara Engine Extension Boilerplate

A minimal `full_page_access` personal extension. Adds a nav bar icon that opens a drawer, runs an ad-hoc LLM prompt via the raw generation endpoint, and injects the result into the active chat as a narrator message.

Use this as a starting point for extensions that need direct API access.

## Stack

- TypeScript + React 19 (own root, not the host app's tree)
- Lucide icons via `lucide-react`
- esbuild IIFE bundle

## Development

```sh
./build.sh
```

Installs deps on first run, then produces `dist/hello-world.personal-extension.zip`.

To iterate with live rebuilds:

```sh
pnpm build:watch
```

Run `pnpm zip` manually after each build to repackage.

## Installation

### 1. Enable external extensions in `.env`

```
ENABLE_EXTERNAL_EXTENSIONS=true
```

Restart the server after editing `.env`.

### 2. Enable the import gate in the UI

Settings → Advanced → **Allow third-party extension imports**

### 3. Import the extension

Addons → External Extensions → **Import Extension** → select `dist/hello-world.personal-extension.zip`

The zip is built with `zip -j` which strips directory paths, so the JS is stored as `hello-world.js` at the zip root. The manifest `jsPath` matches that flat name — do not change it to a subdirectory path or the import will silently skip the extension.

### 4. Enable the extension

Click the power button next to the imported extension.

You will be prompted to acknowledge `full_page_access`. This removes the sandbox — the extension runs with the same privileges as browser console code on the Marinara origin.

### 5. Use it

Open a chat. A wand icon appears in the top nav bar. Click it to open the drawer, enter a prompt, and click **Run**. The LLM response is injected into the active chat as a narrator message.

## How it works

| File | Role |
|---|---|
| `src/main.tsx` | Entry point — mounts the React root, wires the run handler |
| `src/drawer.tsx` | React component — nav button (portal), slide-out drawer UI |
| `src/api.ts` | Fetch helpers — `/api/connections`, `/api/generate/raw`, `/api/chats/:id/messages` |
| `src/invalidate.ts` | Cache invalidation — walks the React fiber tree to find the TanStack Query client and refetch messages |

### CSRF

All same-origin API calls include `x-marinara-csrf: 1`. This is required — requests without it are rejected.

### Active chat ID

Read from `localStorage` key `marinara-active-chat-id`.

### Cache invalidation

After injecting a message, `invalidate.ts` traverses the React fiber tree to locate the host app's TanStack Query client and calls `invalidateQueries` on the messages and messageCount keys. Falls back to firing `offline`/`online` window events (triggers `refetchOnReconnect`) if the fiber walk fails.

## `full_page_access` trade-offs

This capability bypasses the sandbox entirely. The extension can make arbitrary fetch calls, read the DOM, and access `localStorage`. Only use it for extensions you wrote yourself or have fully audited.

The sandboxed runtime does not support direct API calls or message injection, which is why this boilerplate requires the elevated capability.