# Vercel review deployment

- Project: `donawa-gecko-price`
- Project ID: `prj_oLsawRwMUKJpBx50lJVQ0oF3QU1o`
- Team ID: `team_otosiXT47mGUO6GIdSksV9NE`
- Canonical URL: `https://donawa-gecko-price.vercel.app`
- Current verified deployment: `dpl_CrvNJk8JiR3q11jLQa5xwqTzreMc` (커밋 `7bccc50`, 2026-11-18 09:05 KST, production READY)

## Environment boundary

Only these browser-safe variables are configured in Vercel Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server-only variables:

- `DONAWA_CONTACT_EMAIL` — 문의 메일 주소. 5,000 조회를 넘었을 때만 `/api/visit` 응답에 실린다.
- `DONAWA_VISIT_COUNTER_URL` / `DONAWA_VISIT_COUNTER_NAMESPACE` / `DONAWA_VISIT_COUNTER_KEY` (optional) — 방문 카운터 저장소 위치.

## Visitor counter

- `GET /api/visit` → `{ count, threshold, contactVisible, contactEmail }`. 카운터를 세지 않으므로 확인용으로 그대로 호출하면 된다.
- `POST /api/visit` → 방문 1회 기록(브라우저 세션당 1회, 봇·교차 사이트 요청 제외) 후 같은 형식으로 응답.
- 5,000 미만이거나 카운터를 읽지 못하면 `contactVisible: false`, `contactEmail: null`.

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
