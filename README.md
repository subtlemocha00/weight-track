# WeightTrack

A minimal, performance-focused workout tracking Progressive Web App.

WeightTrack is a personal utility for creating reusable workout routines, logging sets/reps/weight quickly in the gym, and tracking progression over time. No social features, no gamification, no AI coaching.

See [CLAUDE.md](CLAUDE.md), [docs/product-spec.md](docs/product-spec.md), and [docs/architecture.md](docs/architecture.md) for the full product and architecture spec.

## Stack

- React (JavaScript)
- Vite
- CSS Modules
- Firebase Authentication + Firestore
- Vercel (hosting)
- PWA (`vite-plugin-pwa`)

## Local development

Requires Node `>=22`.

```sh
npm install
npm run dev
```

Vite will start the dev server on the first available port (default `5173`).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — produce a production build in `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` / `npm run lint:fix` — run ESLint
- `npm run format` — run Prettier
- `npm run check` — lint + build
- `npm test` / `npm run test:ui` — run Vitest
