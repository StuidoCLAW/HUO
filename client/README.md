# HUO client

Vanilla HTML + CSS + ES modules. No bundler, no framework.

## Local dev

In one terminal, run the Fastify server:

```bash
npm run dev          # listens on :3000
```

In another, serve the client statically:

```bash
python3 -m http.server 8080 --directory client
# open http://localhost:8080
```

CORS is locked server-side to `http://localhost:8080` by default — change
`CLIENT_ORIGIN` to serve the UI from somewhere else.

## Deploy

In production the client is served as static files from `/` and the API is
routed to `/api/*`. Both live on the same Vercel deployment.

## Structure

- `index.html` — single-page shell
- `styles/` — reset, table, cards, chips, buttons
- `js/` — api, state, cards, chips, render, animate, reconnect, main
