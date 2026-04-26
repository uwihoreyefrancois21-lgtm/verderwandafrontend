# Verde frontend

## Development

From this folder (`verde/`):

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (usually **http://localhost:5173**).  
If the port is busy, Vite may use **5174** or another port — always use the URL from the terminal.

### `ERR_CONNECTION_REFUSED` / WebSocket failed / `logo.png` failed

These mean the **dev server is not running** or the browser tab points at the **wrong port**:

1. Start (or restart) the dev server: `npm run dev`
2. Use the exact URL Vite prints (e.g. `http://localhost:5173/`)
3. Close old tabs that were left open after stopping the server, then open a fresh tab
4. Do not open `index.html` from the disk (`file://`) — use the dev server URL

The `client:438 … reading 'send'` messages are from Vite’s hot-reload client when the WebSocket cannot connect; they stop once the server is running.

## Production preview

```bash
npm run build
npm run preview
```

Preview serves the built app (no Vite dev WebSocket).
