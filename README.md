# KLPQ

The KLPQ station site: a landing room and the stream pages. React, Vite, Tailwind, three.js.

## Commands

```bash
yarn start        # dev server on http://localhost:4200
yarn build        # type-check and build to dist/
yarn test         # unit tests
yarn prettier:fix # format
```

Configuration comes from `.env` (see `.env.example`). `CURRENT_PAGE=www` builds the landing site, `CURRENT_PAGE=stream` builds the stream site; the GitHub workflow builds and deploys both.

## Layout

- `src/rooms/deadband` – the tuning dial shown on arrival
- `src/rooms/waiting` – the 3D room with one television per channel
- `src/rooms/screening` – the stream page and the video player
- `src/data` – stats API access, channel logic and its tests
- `src/design` – Tailwind theme, textures and shared pieces
- `public/assets`, `public/stock` – media

The design and the remaining work are described in `REACT_REWRITE_PLAN.md`.
