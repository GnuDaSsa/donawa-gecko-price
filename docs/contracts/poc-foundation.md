# Contract: Crested Gecko Morph Price Finder POC Foundation

## Goal
Build a working local POC that lets a user choose a crested-gecko morph by image, compare each platform's current lowest asking price, switch to actual-listing image cards, inspect normalized traits, and open the original listing.

## In Scope
- Next.js App Router with TypeScript and responsive CSS.
- Data-driven 6-column desktop morph grid with tablet/mobile fallbacks.
- Mock-data-backed morph details, ACTIVE/FIXED-only pricing, per-platform minimum selection, freshness labels, listing image view, trait badges, and original links.
- Keyword parser for morph, trait, sex, weight, and price, with combo-first matching and het exception coverage.
- Supabase/PostgreSQL migration for platforms, morphs, traits, listings, join/history tables, RLS/read policies, and history-aware upsert helper.
- Seed data and developer documentation.

## Out of Scope
- Live collectors, scheduler, production Supabase credentials, authentication, public deployment, payments, chat, image-based morph recognition, price prediction, trait filters, and admin/manual-entry UI.

## Acceptance Criteria
- Home morph count is data-driven and renders as 6 × N on desktop.
- `/morph/[slug]` shows only ACTIVE/FIXED listings with numeric prices.
- Price view selects exactly one lowest listing per represented platform.
- Image view sorts qualifying listings by ascending price and shows image, morph, original title, traits, sex/weight, platform, freshness, and external link.
- Parser tests cover combo priority, het protection, contact/bundle pricing, sex, weight, and trait extraction.
- PostgreSQL schema distinguishes current state from price/status histories and SOLD from DELETED.
- `npm run test`, `npm run lint`, and `npm run build` pass.

## Verification Plan
- Quick: `npm run test && npm run lint`
- Full: `npm run test && npm run lint && npm run build`
