# Contract: Private MVP

## Goal
Turn the mock-backed POC into a Korean-first MVP that compares real, current crested-gecko asking-price listings without misrepresenting asking prices as completed transactions or collecting unnecessary seller personal information. A Vercel review deployment is authorized; a promoted public launch remains out of scope.

## In Scope
- Supabase-backed repository used by the user-facing app, with mock data limited to development/test fixtures.
- Vercel review hosting using only the browser-safe Supabase URL and publishable key. Collector/admin secrets must never be deployed.
- Public-page collectors for Feedle and permission-compatible domestic specialist/general shops. Feedle stays on sitemap-listed public HTML; Kiwo stays on its public category/product HTML; MyBreeders stays on its public home/product HTML; Newrun and the Cafe24 group (Newrun Jurassic, Newrun Natural, The Safari, Newrun Repbox, The Breeders, The Best Farm, Newrun Wild, Frienzoo, 도심속도마뱀, 빙하기, 더몬스터, 더쥬, 더드래곤, 줄스, 더쥬 송파점, and 곤충하모니) stay on public category/product HTML and Product JSON-LD; 헬로게코 stays on its public Imweb category/product HTML and Product JSON-LD; WaterTail stays on official public product HTML; ZOO세요 uses only its public category cards and allowlisted individual-listing fields.
- Sitemap/public-HTML-only collection at a conservative schedule; never use a disallowed private API, login bypass, chat, checkout, seller dashboard, or payment route.
- Sanitized listing metadata: platform, public shop/display name, title, price, morph, traits, sex, weight, public thumbnail permission state, update/check timestamps, status, and original URL.
- Exclusion of seller phone numbers, personal addresses, chat data, payment data, and other unnecessary PII from raw snapshots.
- History-aware upsert, collector run logs, failure isolation, freshness/stale handling, protected manual refresh commands, and a managed twice-daily refresh at 09:00/18:00 Asia/Seoul.
- Supabase Cron queues the protected Feedle and public-shop Edge Functions through `pg_cron` + `pg_net`; its project URL and collector secret stay encrypted in Vault and never appear in the repository or cron command.
- A separate daily source-discovery loop that rotates Korean web queries, excludes known/social/private hosts, checks exact-host HTTPS and robots policy, probes only bounded public pages, and records safe evidence in private `source_candidates` / `source_discovery_runs` tables. Price-source eligibility and location-directory eligibility are separate review axes. Discovery never auto-creates a platform, listing, or shop location.
- An optional OpenAI Responses API research channel using a web-search-capable reasoning model, live web search, full source metadata, and strict structured output. It stores candidate listing-price evidence in a service-role-only review table, then independently re-fetches the cited public URL and checks HTTPS, robots, crested-gecko context, numeric fixed price, and sale-state signals. Model claims and search snippets never write directly to user-visible listings; only already-onboarded deterministic collectors or a separately reviewed source onboarding may do so. Missing API credentials must produce an auditable `SKIPPED` run with zero paid call.
- A protected, host-allowlisted reviewed CSV import for Pasamo and Dongmul-Darak. Pasamo may use a user-invoked Playwright review runner with a dedicated persistent profile, at most three explicitly requested pages, a minimum 1.2-second article delay, no CI/cron/background execution, and no password/2FA/CAPTCHA automation. Multi-animal articles are split into stable fragment identities; bundle-only and ambiguous rows stay in a review queue; explicit status evidence is required for SOLD/DELETED/STALE decisions; private APIs and board-wide bulk crawling remain out of scope.
- Production morph/keyword dictionary editing and a data-driven home catalog. Every registered morph and filterable keyword with at least one current comparable listing may appear; newly registered dictionary rows require no home-component edit. Curated representative images remain fallback-only, private-MVP-only, and rights-pending until permission/license is confirmed or owned images replace them.
- Responsive local UI with an availability-filtered image-led home catalog, a prominent detail-page current minimum, full active-price-pool boxplot, one-lowest-listing-per-platform comparison, a separately labelled filterable current-listing catalog, loading/error/empty states, SEO metadata, accessibility, health checks, collector logs, original-listing links, and asking-price disclaimers. Redundant home hero/aggregate metrics and collector/source diagnostics stay out of the user-facing navigation.
- A home utility row pairs the nearby-store entry with a three-second upcoming-expo banner carousel. Expo cards use separately verified public event pages, open the original event page, and disappear after their Korea-time end date. Expo discovery and imagery remain informational UI data and never enter the listing-price pool.
- Public-business location and fulfillment metadata for verified shops only: official storefront/showroom/pickup coordinates, parcel/courier/express-bus/pickup support with evidence and checked date, plus an explicit inventory scope. A shop may enter this directory without a fixed-price catalog only after its own public store/company page proves the location; that path creates no price collector or listing. A `/nearby` test may use an explicitly labelled fixed reference point. If browser geolocation is restored, it may run only after a user action and must not persist or transmit coordinates. Current platform inventory is joined to locations while clearly stating that it is not branch-level stock unless verified as such.

## Out of Scope
- Image-based morph identification, quality grading, price prediction, trade mediation, payment, chat, breeder-lineage verification, private-community bulk crawling, and completed-sale-price claims.
- Collection or inference of private seller home addresses, precise user-location storage/analytics, background location access, route tracking, or claims that an online listing is physically stocked at a branch without source evidence.
- Browser automation of ChatGPT.com as a production crawler, model-only price ingestion, uncited price claims, importing from search snippets without opening the source, or automatic onboarding of an unknown domain directly into the comparison UI.

## External Inputs Required
- No external input is required for the 23 automated private-MVP sources: Feedle plus the 22 public-shop/classified sources enumerated above. Browser reads use only a publishable key, while collector writes run inside protected Edge Functions using Supabase-managed server credentials.
- The scheduled Codex web-search audit provides the primary daily new-domain discovery without another credential. The optional Supabase-only discovery channel requires a Naver Search application ID/secret in Function Secrets; when absent it must write an explicit `SKIPPED` run rather than scrape search-result HTML or fail silently.
- The OpenAI research channel requires a separately billed `OPENAI_API_KEY` stored only in Supabase Function Secrets. No API key is currently required for the rest of the MVP, and the channel remains auditable `SKIPPED / MISSING_OPENAI_API_KEY` until the user explicitly supplies and enables that credential.
- Pasamo activation requires a user-authorized logged-in session and bounded individual-post review; Dongmul-Darak activation requires reviewed real rows exported/shared by the user. Neither source exposes a permitted public listing catalog for unattended collection.
- Any later promoted launch, custom domain, marketing, or broad sharing requires a fresh platform-permission/image-rights review, product/domain decision, and explicit approval.
- The existing local collector secret is required once when provisioning the encrypted scheduler Vault entries on a new Supabase project; the connected MVP project is already configured.

## Acceptance Criteria
- The production UI reads real normalized records from Supabase and clearly labels asking prices and freshness.
- The price/image views show the same price-sorted platform-minimum records, while the separately labelled distribution uses the full active fixed-price pool and exposes exact quartiles and outliers.
- The full-listing catalog shows every comparable current listing, supports per-platform filtering, and paginates without changing the comparison population.
- The home catalog derives categories from every registered morph and filterable keyword, omits groups with zero comparable current listings, sorts by current listing count descending, and does not duplicate the catalog with a promotional hero or global listing totals. Each card keeps the absolute current minimum as its displayed price, uses an unused image-bearing listing nearest the category price median as its representative photo, and falls back to the curated category image when no unused listing photo is available or a remote image fails. The linked morph/trait detail hero reuses the exact same resolved home image and the same curated fallback boundary. Arbitrary seller-title tokens never become categories without dictionary review.
- The `다나와 → 도나와` intro plays only on a direct home document load or hard refresh, never on client-side logo navigation or browser back. Every non-home header, including the custom not-found surface, automatically provides a visibly labelled browser-history back action alongside the independent home link.
- On desktop, the home nearby-store card and upcoming-expo carousel occupy equal columns; on narrow screens they stack without horizontal overflow. The carousel advances left every three seconds, pauses during pointer/keyboard interaction, respects reduced-motion preferences, links each banner to its original event page, and filters events by an inclusive Asia/Seoul end date so expired events disappear automatically.
- Twenty-three approved public sources can discover, normalize, upsert, and refresh listings without deleting history; sources with no current comparable inventory remain absent from the price UI.
- A collector failure cannot mass-change listing statuses.
- Price history is appended only on change; status history is appended only on change.
- SOLD, DELETED, STALE, and UNKNOWN remain distinct and are excluded from current lowest-price results.
- Protected collector endpoints can be run manually and are automatically queued every day at 09:00 and 18:00 Asia/Seoul. Cron engine runs and per-source collector runs are separately auditable in the database.
- New-domain discovery runs daily on a schedule distinct from listing refresh, retains both eligible and rejected evidence, masks contact text, and keeps every candidate out of the price UI until a separate reviewed onboarding change.
- OpenAI web research returns strict structured price candidates with original HTTPS URLs and source metadata; deterministic verification can reject unsupported claims, known blocked/private hosts, robots-blocked paths, price mismatches, and pages without current sale evidence. Its candidate table and run logs are not readable by anonymous or authenticated browser roles.
- Nearby-store search lists evidence-backed public business locations even when no price feed exists, supplements them with clearly separated Kakao Places search results, and never promotes map-search results into verified price/location rows. The map/list UI supports store/region text filtering, explicit Kakao place/address lookup, and price-linked/location-only filters; it defaults to a nationwide South Korea view and constrains map movement/zoom to South Korea. Distance sorting starts after explicit GPS or place/address search action. User coordinates and searched reference points stay in client memory and are never written to Supabase, logs, analytics, or browser storage. Permission denial must fall back honestly to the nationwide view with no fixed substitute location.
- No service-role secret reaches the browser bundle, repository, logs, or chat.
- Public snapshots contain no seller phone/address/chat/payment data.
- A listing card renders only that listing's verified public thumbnail. Missing, blank, or failed image URLs render an explicit `이미지 없음` state and never borrow a morph representative or generic gecko image.
- Automated tests, lint, build, connected-database checks, collector fixture tests, and local HTTP/image-rendering QA pass.
- The authorized Vercel review URL works against Supabase, while custom-domain promotion and broad public release remain blocked pending source/image-rights review.

## Verification Plan
- Unit: parser, sanitization, filtering, pricing, freshness, and history transition tests.
- Integration: connected Supabase migration plus repository, RLS, and history-upsert tests.
- Collector: saved HTML fixtures and controlled live smoke against permitted public pages.
- App: lint, typecheck/build, route/API smoke, collector authorization tests, and image-optimizer smoke.
- Release: local review plus the explicitly authorized Vercel review URL; no promoted public launch.

## Sequencing
1. Safe Supabase schema, seed dictionary, and read repository.
2. Feedle JSON-LD parser, protected collector function, and one controlled live run.
3. Kiwo/WaterTail/MyBreeders/Newrun plus eighteen audited domestic-source adapters, protected multi-source collector, and reviewed CSV import boundary for Pasamo/Dongmul-Darak.
4. Local UI, freshness/asking-price disclosure, diagnostics, and browser QA.
5. Supabase-managed twice-daily scheduled refresh with Vault-backed authentication, one Feedle call, six bounded shop batches, and auditable smoke verification.
6. Daily proactive source discovery with a private review queue, scheduled Codex web audit, optional official Naver Search API Edge channel, and credential-gated OpenAI Responses API web research.
7. Optional later phase: admin UI.
8. Separate future contract: rights review and explicitly approved public deployment.
