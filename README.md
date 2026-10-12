# PyPan

A *Taipan!*-style trading game set in 1860s East Asia, rebuilt as a mobile-friendly
web app with a green-screen terminal look. It targets iPad and iPhone Safari and will
eventually be deployed to Cloudflare as static assets.

- [`SPEC.md`](SPEC.md) — game specification
- [`etc/`](etc/) — the original Python/curses implementation (`pypan.py`), kept as the reference for the port

## Development

```sh
npm install
npm run dev        # Vite dev server (add --host to test on a phone over the LAN)
npm test           # Vitest
npm run typecheck
npm run build      # static output in dist/
```

## Layout

```
src/engine/   pure TypeScript game logic (no DOM); generator-based prompt flow
src/ui/       green-screen terminal UI
src/storage/  save/load behind a SaveStore interface
test/         Vitest unit, scenario and property tests
```

Work is tracked in Beads (`bd ready` to see what's next).
