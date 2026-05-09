# TrackGuide

A web app that recommends iRacing tracks worth buying, based on the cars you race. Pick your cars, choose how to rank (most-weeks-raceable / popularity-weighted / historical-recurrence), get a sorted list of tracks with the reasoning shown.

**Stack**: Vite + React + TypeScript + Tailwind. Static site, deployed to Cloudflare Pages. All recommendation logic runs in the browser against pre-built JSON data.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Build

```bash
npm run build      # type-check + Vite build → dist/
npm run preview    # preview the production build
```

## Data pipeline

The app loads a single static dataset from `public/data/dataset.json`. That file is generated in two parts:

1. The **current season** schedule + cars + tracks are hand-curated in the JSON itself.
2. The **historical 8 seasons** are synthesized by `scripts/build-historical.mjs` from a compact recurrence table baked into the script. Run it whenever the table changes:

   ```bash
   node scripts/build-historical.mjs
   ```

   The script is idempotent — safe to re-run.

In Phase 2 the script will be replaced by a real scraper that emits the same `dataset.json` shape, so nothing in `src/` needs to change.

## Deploying to Cloudflare Pages

The repo is set up for the **Cloudflare dashboard "Connect to Git"** flow.

1. In Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
2. Build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: leave blank
   - **Node version**: `20` (set as an env var `NODE_VERSION=20` if needed)
3. Deploy. CF will auto-deploy on every push to `main`.
4. Once your custom domain is wired in CF DNS, add it in **Pages → Custom domains**.

No backend, no Workers, no env vars required for the prototype.

## Project layout

```
public/data/dataset.json       Canonical app data. Static asset, fetched at runtime.
scripts/build-historical.mjs   One-shot helper to inject 8 seasons of historical schedule data.
src/types.ts                   Domain types (Car, Track, Series, Season, Dataset).
src/lib/dataset.ts             Fetches dataset.json.
src/lib/recommend.ts           Ranking engine — three RankModes.
src/components/CarSelector.tsx Multi-select car picker with search + category filter.
src/components/ResultsList.tsx Ranked track list with the three score stats.
src/App.tsx                    Top-level layout, state, and rank-mode dropdown.
```

## Roadmap

- **Phase 1** *(this commit)*: scaffold, hand-curated seed data, engine, UI, deploy to Pages.
- **Phase 2**: real scraper for current-season schedule. Likely targets: iracing.com/schedule (public), garage61, community season archives. No iRacing login.
- **Phase 3**: backfill 8 seasons of real history. Replace synthesized recurrence table with scraped data.
- **Phase 4**: filters (license class, oval/road/dirt), "exclude already-owned tracks" toggle, mobile polish, share-link state.

## Notes on data

The seed data is illustrative. Prices, configs, and schedule mappings are realistic but not authoritative. Do not link this to real iRacing purchase decisions until Phase 2 lands a real data pipeline.
