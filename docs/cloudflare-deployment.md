# Cloudflare Workers Free deployment

## Route

- Runtime: Cloudflare Workers
- Adapter: `@opennextjs/cloudflare`
- Public endpoint: Cloudflare `workers.dev`
- Worker name: `donawa-gecko-price`
- Plan target: Workers Free

Cloudflare Pages is not used for this full-stack Next.js application. Cloudflare's current guide routes SSR Next.js applications through Workers and OpenNext.

## Commands

```bash
npm run cf:build
npm run cf:preview
npx wrangler login
npm run cf:deploy
```

## Environment boundary

- Next.js reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the local `.env.local` during the build. They are intentionally public browser credentials protected by Supabase RLS.
- `CRON_SECRET` is collector-only and lives in `.env.collectors`, which OpenNext does not scan. It must not be configured in Wrangler, committed, or included in the Worker bundle.
- `.env.local`, `.dev.vars`, `.wrangler`, and `.open-next` are ignored.

## Free-plan checks

- gzip-compressed Worker bundle must remain below 3 MiB.
- Workers Free allows 100,000 requests/day and 10 ms CPU per invocation; network wait time is not CPU time.
- Remote listing images bypass Cloudflare Images optimization (`images.unoptimized: true`) so this MVP does not require a paid image product.
- Verify `/`, `/nearby`, `/morph/lilly-white`, `/api/health`, remote thumbnails, Kakao SDK tiles and markers, Supabase-backed counts, and original listing links after every production deployment.
