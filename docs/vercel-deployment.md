# Vercel review deployment

- Project: `donawa-gecko-price`
- Project ID: `prj_oLsawRwMUKJpBx50lJVQ0oF3QU1o`
- Team ID: `team_otosiXT47mGUO6GIdSksV9NE`
- Canonical URL: `https://donawa-gecko-price.vercel.app`
- Current verified deployment: `dpl_7jigBqypeJRYAaWPxrvexqsmRgUx`

## Environment boundary

Only these browser-safe variables are configured in Vercel Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`CRON_SECRET`, service-role keys, collector credentials, login profiles, and local snapshots must remain outside Vercel.

## Deploy and inspect

```bash
npx vercel deploy --prod --yes
npx vercel inspect https://donawa-gecko-price.vercel.app
```

The Vercel MCP connection is the preferred path for deployment status, build logs, route fetches, and runtime-error inspection. The linked project metadata is stored in ignored `.vercel/project.json`.

## Verified on 2026-08-13

- Production build: READY
- `/`: 200
- `/nearby`: 200
- `/morph/lilly-white`: 200
- `/api/health`: 200 with Supabase configured
- Home browser QA: 39 current categories derived from 11 registered morphs and 28 filterable keyword groups, sorted by listing count, with zero failed image responses
- Dynamic trait detail QA: `/trait/charcoal` returns 200, shows `차콜`, and exposes the current 50,000 KRW minimum
- Home, nearby, Lilly White detail, and health route checks: 200
- The health response reports `dataSource=supabase` and `supabaseConfigured=true`.
- Home trust/footer, nearby footer, detail data guide, decorative English labels, and duplicate helper copy are absent from the three production routes.

This is an authorized MVP review deployment, not approval for a custom domain, marketing, or broad public release. Morph representative images remain rights-pending until permission is obtained or owned/licensed replacements are installed.
