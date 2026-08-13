# Decisions

## 2026-08-12 — Deployment target changed to Vercel

- Cloudflare account creation/OAuth repeatedly failed before deployment.
- The MVP deployment target is now a Vercel preview on the free plan.
- Vercel MCP is installed for project/deployment inspection and logs.
- The local project contains binary morph assets, so the first source upload uses the Vercel CLI after one-time device authorization; collector secrets are never deployed.

## 2026-08-10 — Separate public shop locations, fulfillment evidence, and user GPS
- Context: the user needs to know where current animals can be purchased, whether express-bus shipment, registered mail, quick, specialized delivery, or pickup is possible, and which verified shop is close to the user's current position.
- Decision: add `shop_locations` only for evidence-backed public business/store addresses and `platform_fulfillment_options` for tri-state, scope-aware delivery evidence. Keep all current location inventory at `PLATFORM_ONLINE` unless a source explicitly proves branch stock. Request geolocation only after a button press, retain it only in client component memory, and compute Haversine distance without transmitting, persisting, or logging coordinates. Keep uncertain coordinates null and omit unverified registered-mail claims.
- Consequences: `/nearby` can rank ten verified coordinates while still showing all 18 official addresses, shipping claims remain distinguishable from generic supplies parcel guidance, permission denial has a complete regional fallback, and no private seller address or precise user location enters Supabase.

## 2026-08-07 — Mock-first vertical slice
- Context: the handoff explicitly warns not to let collector complexity block product validation.
- Decision: implement schema, mock/seed data, user-facing flow, and parser before any live collector or scheduler.
- Consequences: the POC runs without external credentials; data access is isolated so Supabase can replace mock data later.
- Follow-up: select and validate one public collector only after UX acceptance.

## 2026-08-07 — Data semantics are product constraints
- Context: asking price, sale status, and morphological vocabulary are easy to misrepresent.
- Decision: enforce ACTIVE + FIXED + numeric-price filtering for comparisons; retain SOLD/DELETED records and histories; keep Morph separate from Trait.
- Consequences: UI language and database checks encode these meanings rather than relying on comments.

## 2026-08-07 — Manual harness recovery
- Context: the global harness wrapper targets a missing compiled CLI file.
- Decision: initialize compatible repo-local harness artifacts manually and record the global blocker.
- Consequences: work can proceed safely from repository state; global wrapper repair remains outside this product scope.

## 2026-08-07 — Licensed stock photos are POC-only representative assets
- Context: the POC needs image-led navigation before production morph photography is licensed and curated.
- Decision: use four locally bundled Unsplash crested-gecko photographs with attribution to validate layout and navigation only.
- Consequences: these files must not be presented as genetically verified examples of every labelled morph; production must replace them with approved morph-specific representative assets.

## 2026-08-07 — Private-MVP collector boundary and PII minimization
- Context: Feedle publicly exposes listing pages and a sitemap, while its robots policy permits public pages but disallows `/api/` and account/transaction surfaces. Public listing descriptions can also contain seller phone numbers and addresses.
- Decision: following the user's explicit private/non-release MVP decision, the first collector uses only the public sitemap and public listing JSON-LD at low frequency. It never calls disallowed APIs or authenticated/transaction routes and never persists seller phone numbers, personal addresses, chat, payment, shipping data, or seller objects.
- Consequences: raw snapshots are restricted to a safe allowlist rather than full-page copies. The app links every result to its source and labels prices as asking prices. Any public release requires a fresh permission and image-rights review.

## 2026-08-07 — Supabase privilege boundary
- Context: the browser needs public read access while a collector needs elevated write access and history-aware RPC execution.
- Decision: the browser receives only a modern publishable key under RLS. Collector writes execute inside a Supabase Edge Function with the platform-managed service-role environment. The function disables gateway JWT verification only because it implements custom SHA-256 secret authentication with constant-time comparison; the database stores only the hash.
- Consequences: no service-role or secret API key exists in the repository, browser bundle, or chat. Anonymous writes and collector-settings reads are denied.

## 2026-08-07 — Prefer omission over speculative morph classification
- Context: recent Feedle pages include unsupported or ambiguous labels such as 노멀, 화이트스팟, and 트라이 without a reliable base-morph mapping.
- Decision: collect only listings matching the explicit MVP morph dictionary; log unsupported labels as warnings rather than guessing.
- Consequences: the first controlled run classified 44 of 56 relevant recent public pages. Coverage can be expanded through dictionary review without corrupting existing comparisons.

## 2026-08-08 — Route each source by its public-access boundary
- Context: the next MVP increment needed sources beyond Feedle, but the candidates have different public surfaces and robots policies.
- Decision: collect Kiwo only from its robots-allowed public category and product JSON-LD. Preserve only publicly indexed official WaterTail animal pages. Do not crawl Pasamo because its Naver Cafe robots policy disallows automated access, and do not reverse-engineer Dongmul-Darak's app because its public website has no listing catalog. Register those two as reviewed manual-import sources instead.
- Consequences: Kiwo can contribute real current lowest asking prices immediately. WaterTail's currently confirmed pages are retained as SOLD history and do not affect current minima. Pasamo and Dongmul-Darak never display fabricated or stale minima; they become active only after reviewed real rows are imported.

## 2026-08-08 — Keep unclassified public-shop animals without making price claims
- Context: Kiwo has valid crested-gecko animal pages whose short shop titles do not map safely to the current twelve-morph dictionary.
- Decision: store the public product and status with `morph_id = null`, but exclude it from morph comparison until the dictionary is reviewed. Fix explicit negative/genetic cases: `논릴리` is never Lilly White, `헷100 아잔틱` is not visual Axanthic, Lilly White + Cappuccino maps to Frappuccino, and Lilly White + visual Axanthic maps to Lilly Axanthic.
- Consequences: source coverage and history are preserved without creating misleading lowest-price rows. Regression tests lock the four ambiguity rules.

## 2026-08-08 — Retire the placeholder platform without deleting history
- Context: `모프하우스` was a POC placeholder, not a verified real source.
- Decision: remove it from reproducible seed/mock platform definitions and mark the existing remote row inactive rather than deleting it.
- Consequences: it never appears in comparison UI, while database history remains reversible and auditable.

## 2026-08-08 — View toggles change layout, never the record set
- Context: the price view rendered one lowest listing per active platform, while the image view rendered every comparable listing, so toggling appeared to replace the results rather than restyle them.
- Decision: both views now render the same `PlatformComparison[]` in the same platform order. Image view shows the same lowest listing card or the same explicit empty-platform state. The summary count reports sites with an available minimum, not the total number of source listings.
- Consequences: price and image views are directly comparable; adding more source listings can change a platform's selected minimum but cannot silently expand only one view.

## 2026-08-08 — Translate Danawa's information hierarchy, not its brand surface
- Context: the user selected Danawa as the price-comparison benchmark and needed to see the amount pool, not only a single minimum.
- Decision: adopt the useful product-comparison sequence—prominent current minimum, source/count facts, section navigation, explicit comparison conditions, price-sorted shops, and original-source CTA—without copying Danawa trademarks or pixel styling. Replace consumer-electronics price-trend content with a boxplot suited to sparse animal listings.
- Consequences: the detail page now supports the decision path `current minimum → full active price distribution → one minimum per shop → data rules` while preserving MorphPick's own editorial identity.

## 2026-08-08 — Boxplots use the full active fixed-price pool
- Context: a boxplot built only from one minimum per platform would describe two shops rather than the actual listing market and could mislead users.
- Decision: calculate R-7 quartiles from every ACTIVE + FIXED + numeric listing belonging to an active platform. Use Tukey 1.5×IQR whiskers at observed prices; render outliers as separate points and labels while also showing exact min, quartiles, median, max, and mean.
- Consequences: the Lilly White distribution currently represents 36 listings, while the shop table remains the distinct three-row per-platform minimum comparison. The UI explains that these are asking prices, not completed sale prices.

## 2026-08-08 — Platform minima and the full listing catalog are separate views
- Context: a one-row-per-shop comparison correctly answers “where is the current minimum?” but hid the other real animals in the same price pool.
- Decision: retain platform minima for price comparison and add a separately labelled catalog backed by the exact same ACTIVE + FIXED + numeric morph population as the boxplot. The catalog is price-sorted, filterable by source, and reveals 12 records at a time.
- Consequences: the user can inspect all 36 current Lilly White listings without changing the semantics of the three-shop minimum comparison. Counts in the hero, boxplot, catalog, and filters share one repository query.

## 2026-08-08 — MyBreeders uses only public discovery and allowlisted product fields
- Context: MyBreeders exposes public products in server-rendered home/product HTML but the embedded product object also contains seller details that are unnecessary for price comparison. Its current sitemap no longer lists product URLs.
- Decision: discover opaque product IDs only from the homepage `initialProductPage` payload when sitemap product URLs are absent, then parse each public product page into an explicit allowlist: product ID, title, price, status, species, morphs, trait, sex, weight, image, trade type, sale channel, and original URL. Do not retain descriptions, seller objects, addresses, chat, account, order, or `/api/` data.
- Consequences: MyBreeders contributes 12 current public rows, seven safely classified rows, and three Lilly White comparisons while preserving the same PII-minimization and history rules as other collectors.

## 2026-08-08 — Expand with Newrun; keep Pasamo human-selected
- Context: the user requested broader coverage including Pasamo, but source access boundaries differ. Newrun Reptile exposes a public Cafe24 crested-gecko category and Product JSON-LD, while Naver Cafe disallows unattended retrieval and the current browser sessions are not logged into Pasamo.
- Decision: add Newrun through a six-page public-category collector that stores only product identity, title, image, fixed price, sold flag, original URL, and classification-safe fields. Keep Pasamo on the protected, host-allowlisted reviewed-import path; a user with login/membership access must select the individual posts first.
- Consequences: Newrun contributes 68 real rows without using account, API, seller, chat, or payment surfaces. After the user completed Naver login, three current Pasamo Lilly White individuals with explicit prices were reviewed one article at a time and imported through the protected host-allowlisted path. Pasamo is now active, but no unattended search loop or bulk crawl exists.

## 2026-08-08 — Pasamo imports are per-individual, not page dumps
- Context: a Pasamo article can contain several animals, several prices, contact details, and unrelated narrative. Treating an entire article as one scraped listing would either misprice the animal or retain unnecessary personal data.
- Decision: create one reviewed row per clearly identified individual. Use a stable article URL plus an item fragment when a page contains multiple animals; store only the selected title, fixed price, morph, sex, weight, optional verified image, and original URL. Leave the description null and raw data limited to importer provenance.
- Consequences: the first reviewed manifest contributes three Lilly White rows at 30,000, 50,000, and 200,000 KRW. Database verification confirms no article body, nickname, phone, address, or chat data was stored.

## 2026-08-08 — Reference-led commerce shell, data-led content
- Context: the functional MVP had Danawa-like comparison semantics but still looked like a sparse POC. The user supplied a clean electronics-commerce reference with a warm canvas, rounded white shell, dual-row navigation, large hero, category cards, and restrained promotion blocks.
- Decision: translate that visual grammar into MorphPick rather than copying product artwork or sale language. Use one warm peach canvas, one ivory application shell, white cards, charcoal type, terracotta-orange actions, and small sage data accents across home and detail. Keep every market number live: home cards read active fixed-price listings and source counts from Supabase; search matches Korean, English, and aliases; detail retains the exact existing minimum/distribution/platform-minimum/catalog populations.
- Consequences: home and detail now feel like one MVP product while preserving asking-price disclaimers and animal-specific editorial restraint. Promotional modules say current data/price signals, never discounts or sales. The existing local Browser URL policy still blocks localhost reload, so visual verification must be completed by the user in the already-open tab; automated acceptance relies on tests, production build, server-rendered content, health, and search-route HTTP checks.

## 2026-08-08 — Expand Pasamo only through a bounded human review
- Context: the first three Pasamo rows proved the reviewed-import route, but the Lilly White price pool was too small while unattended Naver Cafe crawling remained outside the contract.
- Decision: perform one latest-first Lilly White search in the authenticated user session, open at most 20 results sequentially, and import only active individual animals with an explicit fixed price. Exclude giveaways, exchanges, bundles without per-animal prices, inquiry-only offers, and completed sales. Continue to omit article bodies, nicknames, phones, addresses, chat, and unverified per-animal images.
- Consequences: the earlier manifests proved the bounded route and are retained as history. The later full audit in `docs/reviewed-imports/pasamo-2026-08-09-full-audit.csv` supersedes their current-state snapshot with 46 per-individual rows. Future expansion must repeat a similarly bounded, user-authorized review rather than introducing a crawler.

## 2026-08-08 — Curated category images override stale database seed paths
- Context: the twelve home morphs reused four stock photos, so several genetically different categories appeared identical. A connected Supabase project could also override corrected local paths with an old `representative_image` value.
- Decision: use twelve distinct real-animal reference photos, normalize each to a 1600×1120 WebP artboard without cutting off the animal, record every source and rights state, and keep the curated local slug mapping ahead of the database value in `mapMorph`.
- Consequences: all home categories now render unique `/morphs/<slug>.webp` assets and a regression test rejects missing or duplicate mappings. The images are private-MVP-only category navigation references, never substitutes for listing images or genetic proof. Public release remains blocked on permission/license verification or replacement with owned images.

## 2026-08-08 — Brand the private MVP as 도나와
- Context: the user chose a Danawa parody name and asked for a literal `다나와` → `도나와` opening transformation.
- Decision: use 도나와 in the header, metadata, footer, health identity, and package name. On the first page entry of a tab session, draw the first Hangul syllable from strokes and rotate `ㅏ` into `ㅗ`; keep a visible skip action and bypass the motion for repeat visits and reduced-motion users.
- Consequences: the parody is communicated as a short brand moment rather than repeated UI clutter. The actual product surface retains its own warm commerce-shell design instead of copying Danawa's trademarked visual skin.

## 2026-08-08 — Remove redundant navigation and public source diagnostics
- Context: the home page repeated “모프 찾기” actions, hardcoded Lilly White entry points, keyword shortcut chips, and internal source-coverage information that did not help the core price-comparison task.
- Decision: keep one brand header, one full-width search, one image-led catalog, and one current-price-signal section. Search examples are no longer rendered as adjacent shortcuts; all detail links follow the selected card. Collector and coverage diagnostics remain internal while every price result still links to its original listing.
- Consequences: the primary flow is now `search or choose image → compare price pool → inspect listings`, with fewer competing routes and no Lilly White-only functional path.

## 2026-08-08 — Home discovery is not capped at twelve morphs
- Context: twelve entries reflected the first database seed, not the real breadth of crested-gecko marketplace vocabulary. Treating every descriptive term as a Morph would also corrupt the established Morph/Trait boundary.
- Decision: compose discovery from every visible primary Morph plus a curated catalog of high-value Pattern/Color/Trait categories. The current private MVP exposes twelve primary morphs and eight pattern/trait categories (twenty total), with dynamic counts and route types (`/morph/*` or `/trait/*`) rather than a hardcoded twelve-card ceiling.
- Consequences: future reviewed morphs or traits can be added without redesigning the page. Twenty unique normalized representative assets back the current catalog; unavailable categories remain honest “data preparing” states instead of fabricated prices.

## 2026-08-08 — Expand existing public discovery before adding another crawler
- Context: the user requested substantially more listing information. The connected collectors had previously sampled only 44 Feedle, 60 Kiwo, and 12 MyBreeders rows even though their approved public discovery surfaces could expose more current products.
- Decision: run one bounded refresh at each collector's existing safety ceiling: Feedle at its 60-page cap and each public shop at up to 100 products. Keep the same public sitemap/category/product-only boundaries, rate delay, safe-field allowlist, history-aware upsert, and failure isolation. Do not turn Pasamo into an unattended crawler.
- Consequences: the database grew from 208 to 335 real rows and from 141 to 260 active fixed-price rows without adding a new access boundary. The home catalog now represents 215 comparable records; unmatched vocabulary remains stored or logged for review rather than force-classified.

## 2026-08-09 — Run public collectors twice daily with Supabase-managed scheduling
- Context: current asking-price comparisons need predictable freshness without keeping a local computer, browser, or background process running.
- Decision: schedule one database job at `0 0,9 * * *` UTC, corresponding to 09:00 and 18:00 Asia/Seoul. The job queues the protected Feedle and public-shop Edge Functions through `pg_cron` + `pg_net`. Store the project URL and existing collector secret in Supabase Vault; keep the cron command free of credentials and restrict scheduler invocation to `postgres`.
- Consequences: the connected private MVP refreshes Feedle, Kiwo, WaterTail, MyBreeders, and Newrun twice daily even when the local app is closed. `cron.job_run_details` proves scheduler execution while `collector_runs` records per-source outcomes. Pasamo and Dongmul-Darak remain outside unattended scheduling because they require bounded human review.

## 2026-08-09 — Start the home page at the availability-only catalog
- Context: the large “모프의 가격을 한눈에 비교하세요” hero, browse CTA, and aggregate source/listing/category counts repeated the catalog immediately below and delayed the actual task.
- Decision: remove the entire promotional home hero and its aggregate facts, remove the catalog item-count badge, and filter the reviewed morph/trait pool to summaries with both a positive comparable listing count and a current minimum price. Search uses the same availability-filtered population. Also remove the later four-item `지금 비교할 수 있는 모프` ranking block because it repeats the same available catalog rather than adding a new user task.
- Consequences: the header now leads directly into image-led price discovery, zero-inventory categories no longer create dead detail paths, and the catalog count changes honestly as inventory changes. After the catalog, the page proceeds directly to the compact data-principles strip and footer. Keep category definitions and representative assets in the reviewed pool so a category returns automatically when a comparable listing appears.

## 2026-08-09 — Never fabricate a listing image fallback
- Context: listing cards without an original thumbnail reused the same bundled gecko photo, making unrelated animals look duplicated and falsely associating that photo with real listings.
- Decision: render `next/image` only for a non-blank listing `imageUrl`. For a missing URL or client-side load failure, render a neutral icon and the visible label `이미지 없음`; keep the platform badge and all price/source metadata intact.
- Consequences: category representative images remain limited to morph discovery and detail headers. On the current Lilly White first page, seven missing-image cards now show the placeholder while five verified thumbnails remain, with zero generic local fallbacks.

## 2026-08-09 — “국내 전부” means a complete safe-surface audit, not access-boundary bypass
- Context: the user requested every available domestic listing source, but candidate sites range from public fixed-price catalogs to login communities, apps, consultation-only channels, mixed-species event pages, and dead domains.
- Decision: automate every audited source that exposes a robots-compatible public crested-gecko category and a verifiable current fixed price/status. Add Newrun Jurassic, Newrun Natural, The Safari, Newrun Repbox, The Breeders, The Best Farm, Newrun Wild, Frienzoo, and ZOO세요. Exclude app/login-only, consultation-only, product-supply-only, mixed-event, and unavailable-domain candidates from automatic price comparison; keep Pasamo on its bounded reviewed-import route.
- Consequences: automated coverage expands from five to fourteen sources without fabricating prices or bypassing accounts. The audit and exclusion rationale live in `docs/domestic-source-audit.md` so “everything” remains reproducible rather than an open-ended crawl claim.

## 2026-08-09 — Reuse public Cafe24 commerce semantics and minimize ZOO세요 fields
- Context: eight new specialist shops share public Cafe24 category/product markup, while ZOO세요 serves EUC-KR classifieds whose detail pages can contain seller contact and narrative text that price comparison does not need.
- Decision: Cafe24 discovery follows exact-host HTTPS category/product links and reads Product JSON-LD, with the category sold-out icon overriding generic availability metadata. ZOO세요 decodes EUC-KR, takes current/sold state and thumbnail from the public category card, accepts only `일반분양` rows whose species is exactly `크레스티드 게코`, and stores only safe title/species/sex/price/original URL fields. Seller body, name, address, phone, and email are never retained; phone/email-like text is masked if it leaks into a title.
- Consequences: one tested parser family covers the domestic shop cluster while keeping source-specific safety behavior. The nine first controlled runs stored 125 rows with zero collector warnings and zero phone/email-pattern hits in stored title, description, or raw data.

## 2026-08-09 — Split the twice-daily refresh into bounded Edge requests
- Context: serializing every domestic shop in one free-tier Edge Function request risks timeout as source coverage grows.
- Decision: keep one cron job at `0 0,9 * * *` UTC, but queue Feedle plus three protected public-shop calls: the existing four-source group, a five-source domestic group, and a four-source domestic group. Cap scheduled shop runs at 48 products per source and preserve failure isolation in `collector_runs`.
- Consequences: 09:00/18:00 Asia/Seoul freshness remains unchanged while each invocation has a bounded latency/traffic budget. One failed source or batch cannot mass-change unrelated listing status.

## 2026-08-09 — Preserve multi-animal articles as distinct listing identities
- Context: Pasamo article 5608467 contains four individually priced animals, while the first reviewed manifest had captured only items 1–3. Item 4 is written as `헷100릴리`, which is not safe evidence of a visual Lilly White morph.
- Decision: keep one row per individual using `article URL + stable item fragment`, so `#lilly-baby-1` through `#lilly-baby-4` hash to separate external IDs. Add `classification_mode` to reviewed imports: `UNCLASSIFIED` stores a current fixed-price animal but forces `morph_id = null`; `EXPLICIT` matches only the reviewer-provided morph; the default `AUTO` retains the prior dictionary behavior.
- Consequences: item 4 is stored separately at 20,000 KRW without changing the Lilly White price pool. The importer remains idempotent, keeps article bodies/contact data out of the database, and can safely represent future multi-animal posts without page-level price conflation.

## 2026-08-09 — Pasamo sale state requires explicit seller evidence
- Context: ten already-reviewed Pasamo articles contained 46 animals, discount arrows, old-price strike tags, one explicit `분양완료`, and several unsupported/ambiguous morph labels. Treating any strike, old post, or missing search result as SOLD would create false completed-sale claims.
- Decision: re-audit all ten existing articles and split every explicit offer into a stable fragment row. ACTIVE requires a visible offer with no completion marker. SOLD requires item/article `분양완료/판매완료/거래완료` evidence. Reservation maps to UNKNOWN, a confirmed not-found article to DELETED, and aged unreviewed inventory to STALE. Preserve last asking price for history; never infer an actual transaction price. The Edge importer rejects SOLD without explicit completion evidence.
- Consequences: Pasamo now has 46 rows: 44 active fixed-price, 28 active comparable, one contact-only, and one explicitly sold. Article 5608469's crossed-out old prices were corrected as discounts, not sales; its Lilly White female is ACTIVE at the final 150,000 KRW rather than the previously conflated 50,000 KRW. Article 5608527's Lilly Axanthic baby is the sole SOLD row because its item block explicitly says `분양완료`.

## 2026-08-09 — Replace manual Pasamo page-turning with a bounded Playwright review runner
- Context: the prior ten-article audit covered only URLs already present in the database, while the actual menu 1704 newest page alone exposed 20 non-notice articles and many posts contained 10–40 animals. Calling the ten URLs a full board audit was incorrect, and direct one-page-at-a-time Browser control is not a maintainable refresh path.
- Decision: add `scripts/pasamo-review.mjs` using Playwright 1.62.1 with a dedicated persistent Chrome profile outside the repository. Login, 2FA, CAPTCHA, and membership remain user actions. Every run requires `--acknowledge-boundary`, is limited to 1–3 requested pages with at least 1.2 seconds between articles, refuses CI, never joins cron, never uses a private API, and never writes raw article bodies or seller/contact fields. The parser produces importer-ready active fixed-price rows separately from bundle, reservation, unit-inferred, contact, and missing-price review rows.
- Consequences: routine refreshes become reproducible and far faster without turning Pasamo into an unattended crawler. `npm run pasamo:login` initializes the reusable session; `npm run pasamo:review -- --acknowledge-boundary --pages=1 [--apply]` performs a bounded batch. Batch scope must be reported as exact pages/articles/items, never “the entire board.”

The first production run of this decision reviewed the 20 newest non-notice articles on menu 1704 page 1 at 2026-08-09 11:58 KST. It imported 93 active fixed-price individuals from 13 articles, held 9 ambiguous/non-comparable rows, excluded 3 free offers, and failed 0 articles. Re-importing the same ready CSV changed neither the 669 listing total nor the 666 price-history and 670 status-history totals.

## 2026-08-10 — Expand from specialist sources into permission-compatible general reptile shops
- Context: the user asked for ordinary reptile-shop inventory such as 도심속도마뱀, not only breeder/specialist marketplaces. Public Korean shop catalogs vary between Cafe24, Imweb, robots-blocked Godomall sites, dead domains, supply catalogs, and mixed-species event products.
- Decision: add nine public shop adapters/platforms: 도심속도마뱀, 빙하기, 더몬스터, 더쥬, 더드래곤, 줄스, 더쥬 송파점, 곤충하모니, and 헬로게코. Reuse the exact-host Cafe24 JSON-LD collector for eight, add a tested exact-host Imweb category/Product JSON-LD adapter for 헬로게코, strip embedded product-title markup, and reject titles naming another species or supplies even when they also mention crested geckos. Keep robots-blocked, TLS/DNS-unavailable, login/contact-only, and supply-only candidates out of unattended collection.
- Consequences: controlled runs 73–81 stored 454 additional real source rows (244 current fixed-price and 210 sold history), of which 157 current rows are safely morph-comparable. Connected checks found zero phone/email patterns, title markup, mixed-species/supply titles, host violations, or active rows without a fixed price. Automated coverage is now 23 sources total. Edge Function v10 and the existing 09:00/18:00 cron use Feedle plus six bounded shop calls; one failed shop remains isolated from unrelated listing state.

## 2026-08-10 — Separate proactive source discovery from fixed-source refresh
- Context: refreshing a fixed allowlist twice a day keeps prices fresh but can never discover a newly launched or previously missed domestic shop. Waiting for the user to name every source is not a sustainable monitoring strategy.
- Decision: run a daily 08:20 Asia/Seoul Codex web-search audit with rotated queries and store safe candidate evidence under provider `CODEX_WEB_SEARCH`. Add a second protected 03:30 Asia/Seoul Supabase Cron path using only the official Naver Web Search API under `NAVER_WEB_SEARCH`; it records `SKIPPED` when credentials are absent. Both paths use a private review queue with `NEW`, `ELIGIBLE_REVIEW`, `REJECTED`, and `ONBOARDED` states. Eligibility requires robots-compatible exact HTTPS, crested-gecko relevance, fixed price, sale-state evidence, and Product structure; category pages may trigger only one same-host public product probe. No discovery run auto-writes `platforms` or `listings`.
- Consequences: new sources can now be surfaced without user prompting while false positives, dead domains, social/login surfaces, PII, and unsafe crawl routes remain outside production data. The first audit placed 타란센터 in `ELIGIBLE_REVIEW` and 크레팍스 in `REJECTED / DNS_UNRESOLVED`. Onboarding remains a deliberate parser and controlled-run change rather than an automatic trust decision.

## 2026-08-10 — Use GPT web search as evidence discovery, never as the listing writer
- Context: the user asked to connect web-capable GPT and use professional-grade reasoning to find price evidence across as much of the Korean web as possible. A model can broaden discovery, but search snippets and model-generated prices are not sufficiently reproducible to become comparison rows by themselves.
- Decision: add a credential-gated OpenAI Responses API channel using `gpt-5.6-sol`, high reasoning effort, required live `web_search`, high search context, strict structured output, and full source metadata. Store claims in the private `price_evidence_candidates` queue only after source-provenance checks; independently re-fetch each direct HTTPS page and compare exact KRW price and explicit sale state. Unknown validated domains may become `ELIGIBLE_REVIEW`, but neither known nor unknown claims may write directly to `platforms` or `listings`. Missing `OPENAI_API_KEY` must finish as an auditable zero-call SKIP.
- Consequences: long-tail public product discovery can use model reasoning without turning hallucinations, snippets, social/login pages, or seller PII into prices. The channel is scheduled separately at 04:10 KST, has service-role-only RLS, and remains inactive at zero API cost until the user places a separately billed key directly in Supabase Function Secrets. The first smoke run passed as run 4 with `MISSING_OPENAI_API_KEY`, `search_calls=0`, and no evidence rows.

## 2026-08-10 — Make nearby-shop discovery a primary utility
- Context: `내 주변 매장` was easy to miss as a small header action, became icon-only on narrow screens, and the `/nearby` introduction separated the explanation from the actual GPS/region controls.
- Decision: place a full-width nearby-shop utility band directly below home search, keep the header label visible on mobile, and merge the `/nearby` introduction and locator controls into one first-viewport hero. Keep GPS as an explicit button action with the existing client-memory-only privacy boundary and retain region selection as the permission-free fallback.
- Consequences: users can discover the feature before entering the morph catalog and can start either distance or region browsing without scrolling. Shop, fulfillment, geolocation, and inventory data logic remain unchanged.

## 2026-08-10 — Cross-search social and expo channels without treating them as prices
- Context: fixed-domain refresh missed stores that surface first through Instagram, Threads, X, reptile fairs, animal forums, blogs, or connected storefront links.
- Decision: extend the daily source-discovery heartbeat to rotate those channels, but use them only to discover names and candidate URLs. A store location requires a separate official shop/company page; a price source requires a separate robots-compatible public product page with exact fixed price, crested context, sale state, and reviewed structure. Social snippets, booth posts, and private-seller addresses never become database facts.
- Consequences: Taran Center and Reptile Store were promoted to bounded Cafe24 collectors after independent confirmation; Crerism Cheongna and Nang Gecko were added as location-only rows. Unverified social hits remain leads rather than contaminating platform or listing data.

## 2026-08-10 — Use a fixed Songpa test point and Kakao map deep links
- Context: the in-app browser did not provide usable GPS for the requested test, and the OpenStreetMap destination UI was not suitable for the intended Korean consumer experience.
- Decision: temporarily fix nearby sorting to `서울 송파구 양재대로 1218` (`37.514674, 127.132349`) and label that state explicitly instead of pretending it is live GPS. Replace every OpenStreetMap destination link with Kakao's official `/link/map/` URL, falling back to `/link/search/` when a shop has no verified coordinates. Do not add a Kakao JavaScript key for a simple external-map action.
- Consequences: the test works without a geolocation permission prompt or API credential, all 22 shops have a Kakao map action, and cached OSM-derived coordinates retain their required attribution. An embedded Kakao map remains a later opt-in requiring a developer app key and registered domain.

## 2026-08-11 — Treat fulfillment-priced variants as one animal offer during source review
- Context: the daily source audit found 뉴런네이처 Product JSON-LD in which one crested-gecko product is repeated across quality tiers and receiving methods; express-bus surcharges appear inside offer prices.
- Decision: keep the domain in `ELIGIBLE_REVIEW`, not production. A later deterministic collector may use the public product as one offer only after defining the animal-only base-price rule. Receiving-method surcharges must populate fulfillment evidence or be ignored, and must never create duplicate animal listings. Quality tiers may remain product options unless the source exposes a stable independently identifiable animal.
- Consequences: the source can be onboarded later without inflating the price pool, double-counting one product, or comparing delivery fees as animal prices. The daily discovery run itself still changes only private review tables.

## 2026-08-11 — Embed a no-key consumer map while keeping Kakao navigation explicit
- Context: `/nearby` only exposed external Kakao deep links, so the page itself did not look or behave like a Korean map-discovery surface even though distance sorting worked.
- Decision: embed Leaflet with CARTO Positron raster tiles inside `/nearby`, using the fixed Songpa test point, numbered shop pins, active-pin highlighting, selected-shop price/inventory details, and a responsive search-style map shell. A first MapLibre/WebGL attempt was rejected after real-browser QC showed a zero-height container and then a blank vector canvas; the raster route was adopted only after all 28 visible tiles loaded in the in-app browser. Keep the yellow `카카오맵에서 보기` action as an explicit external Kakao deep link. Do not imply that the embedded tiles are Kakao or add an unconfigured Kakao SDK.
- Consequences: the private MVP now provides an interactive in-page map without an API key, synchronized with region filters and shop cards. Fourteen coordinate-verified shops appear on the map; eight address-only shops stay in the directory without fabricated pins. A true embedded Kakao map remains a later opt-in requiring a JavaScript key and registered domain.

## 2026-08-12 — Deploy full-stack Next.js through Cloudflare Workers and OpenNext
- Context: the private MVP uses Next.js server rendering and Supabase-backed routes, so a static Pages export would not preserve the current application behavior. The target is Cloudflare's free plan rather than a public production launch.
- Decision: use Cloudflare Workers with the official OpenNext adapter, keep remote images unoptimized to avoid a paid Cloudflare Images dependency, and package only public Supabase browser configuration. Collector credentials stay in the ignored `.env.collectors` file and never enter Wrangler variables or the Worker bundle.
- Consequences: the generated Worker is 1.29 MiB compressed, below the free-plan 3 MiB Worker limit, and local Workers runtime checks pass for `/`, `/nearby`, `/morph/lilly-white`, and `/api/health`. Actual `workers.dev` publication still requires the user to complete Cloudflare OAuth in the visible login tab.

## 2026-08-12 — Use a vertical price distribution and terse Korean interface copy
- Context: the horizontal boxplot made the full price pool harder to scan, circular platform initials were visibly off-center because a neighboring text selector also matched the mark, and many explanatory sentences sounded generated rather than product-like.
- Decision: render the boxplot on a bottom-to-top price axis with vertical whiskers, a horizontal median, vertically positioned outliers, and exact statistics below. Give platform marks an isolated `inline-grid` centering rule. Rewrite user-facing copy as compact labels or noun phrases while retaining essential provenance and safety qualifiers.
- Consequences: the distribution now reads as a vertical amount pool, platform initials are geometrically centered, and the main routes contain less filler without weakening the distinction between asking prices and completed transactions or hiding location/source limitations.

## 2026-08-13 — Bind home category photos to the displayed minimum listing
- Context: home morph and pattern cards showed curated representative photos even though their prices came from live minimum-price listings, so the pictured animal and displayed amount were unrelated.
- Decision: include listing ID, title, and image URL in the home-market summary query. Select the absolute lowest-price comparable listing; within an exact-price tie only, prefer a row with a usable image and then use stable ID order. Show that listing image on the card, falling back to the curated category representative only when the chosen minimum has no image or the remote image fails. Keep individual listing-card missing-image behavior unchanged.
- Consequences: the photo and price on each home card now describe the same minimum-price offer population. A higher-priced photo can never replace a cheaper image-less row, while exact-price ties can avoid an unnecessary representative fallback. Production QA rendered 17 cards as 14 listing photos plus three representative fallbacks with zero failed image responses.

## 2026-08-13 — Remove explanatory chrome that repeats visible product data
- Context: the home trust strip and multi-column footer repeated claims already evident from cards and detail views, while decorative English eyebrows, MVP status text, data guides, section subtitles, and map helper footers added copy without enabling another action.
- Decision: remove the home trust strip and footer, nearby footer, detail price guide, decorative English section labels, duplicate section descriptions/count blocks, header descriptor/status slogan, nearby benefit chips, and map helper footer. Preserve functional headings, search/filter/navigation controls, current values, empty/error states, original-source actions, map attribution, inventory-scope warnings, and one compact asking-price boundary beside comparison facts.
- Consequences: home ends immediately after the catalog, detail pages move directly through price overview, distribution, comparison, and listings, and nearby keeps only controls and evidence needed to act. Local and production browser audits found none of the removed phrases or sections on `/`, `/morph/lilly-white`, or `/nearby`.

## 2026-08-13 — Derive the home catalog from the reviewed morph and keyword dictionary
- Context: a fixed 20-card home catalog hid many recurring market labels and made the visible morph set look artificially capped even as the listing database grew.
- Decision: build the home catalog from every registered morph plus every `traits.is_filterable = true` keyword that has ACTIVE, FIXED, numeric-price inventory. Omit empty groups and sort the rest by current listing count descending. Add 18 reviewed recurring facets—노멀, 드리피, 크림시클, 엠티백, 화이트스팟, 헷 아잔틱, 텐저린, 화이트핀, 다크, 크림, 화이트크라운, 차콜, 스팟, 릴리세이블, 슈퍼스트라이프, 모자이크, 하이포, 논릴리—and backfill existing listing links. Keep arbitrary seller-title tokens out until dictionary review.
- Consequences: the current production home shows 39 inventory-backed categories instead of a fixed 20, and the set changes automatically as registered inventory changes. One listing may appear in several keyword facets by design; these are overlapping search facets rather than mutually exclusive primary morph classifications. Migration `expand_listing_keyword_facets` added 528 existing listing-trait links, and future collector classification uses the expanded dictionary without another home-component edit.

## 2026-08-13 — Separate the shop directory from price-source eligibility
- Context: the nearby directory excluded legitimate reptile shops whenever they did not expose a deterministic public fixed-price catalog, even though the user needs stores and locations independently from price comparison.
- Decision: review two evidence axes independently. An official store/company page may support a `shop_locations` row and an inactive manual platform with zero listings; numeric prices still require the existing robots-compatible product and sale-state boundary. Rebuild `/nearby` as a familiar search/filter + result-list + map explorer, visibly label zero-price stores as `가격 미연동`, start at the fixed Songpa reference, and constrain Leaflet to South Korea. Do not fabricate a pin when a coordinate is uncertain. Make the home brand intro replay on every full refresh rather than storing a session-level seen flag.
- Consequences: six Dear Rep branches from the brand's official store page bring the directory to 28 official addresses and 20 mapped locations while producing zero new prices/listings. Users can filter all stores, current-listing stores, and location-only stores. The map cannot be panned or zoomed out into an unrelated world view; Kakao remains the explicit external navigation action. The landing action now replays after every home refresh, with the skip button affecting only the current playback.
## 2026-08-13 — Actual Kakao map with official-address runtime geocoding
- Context: the CARTO/OSM embed looked unfamiliar to Korean users, and many official store addresses did not have safe stored coordinates.
- Decision: replace Leaflet/CARTO with the MIT-licensed `react-kakao-maps-sdk` wrapper over Kakao's JavaScript SDK. Keep database coordinates null when not independently verified; resolve those official addresses in the browser with Kakao's `services` library and cache only the public address result locally. Require the Kakao JavaScript key and registered SDK domains rather than borrowing tiles or pretending another map is Kakao.
- Consequences: the list and external Kakao links still degrade safely without a map key. Kakao app 1543645 now supplies the free Map API quota; localhost and the canonical Vercel host are registered SDK domains, and the JavaScript key is stored only in ignored local and Vercel environment variables. Local and production Playwright checks loaded all 21 visible map images, exposed 38 synchronized markers, and reported zero console errors. Ten newly verified location-only businesses create no prices, listings, or active collectors.
## 2026-08-13 — Replace the fixed test point with explicit GPS and separate Kakao Places discovery

- Decision: remove the Songpa substitute coordinate from `/nearby`. Start with a nationwide South Korea view and request browser geolocation only after the user presses `내 위치`; keep the coordinate in client memory only and use it for Haversine sorting and map centering. If permission fails, show a short status and retain the nationwide view. Supplement the 38 official-address rows with Kakao Places JavaScript keyword-search results cached in browser storage for 24 hours, but label them `지도검색`, exclude phone data, deduplicate against verified stores, and never persist them to `shop_locations`, `platforms`, or `listings`.

## 2026-08-13 — Focus GPS at neighborhood scale

- Decision: after `내 위치` succeeds, set the Kakao map center directly to the returned coordinate and jump to level 4. Suppress the automatic nationwide reset while a user point is active so result reordering and runtime geocoding cannot zoom the map back out. The manual `전국` control remains available.

## 2026-08-13 — Use one store marker across location sources

- Decision: remove the yellow `K` circle for Kakao Places, numbered orange pins for verified stores, and source-specific map marker classes. Every store now uses the same orange pin with a white center in both the list and map. Preserve source provenance in `매장`/`지도검색` badges and selected-card text instead of the marker graphic; cluster markers and the blue user-location marker remain distinct because they represent different object types.

## 2026-08-13 — Separate store filtering from place/address lookup

- Decision: retain live filtering while the user types, but make Enter and the map-pin submit action run a general Kakao Places keyword lookup with address geocoding fallback. On success, keep the entered text, show the resolved place label, center at level 4, clear the text filter internally, and sort the full store directory by distance from the resolved point. On failure, keep the nationwide state and show `장소를 찾지 못함`. Do not persist or insert the searched reference into shop or price tables.

## 2026-08-13 — Replay the brand intro only at the document boundary

- Context: using the header brand mark to return from a listing or nearby page remounted the home intro, which made ordinary in-app navigation feel like a repeated landing page. Detail views also lacked a direct way to return through browser history.
- Decision: remember intro playback only for the lifetime of the current browser document. Play it on a direct home load and every hard home refresh, but skip it when a Next.js client transition or browser back reaches home. Derive a browser-history back action automatically on every non-home route while preserving the brand mark as a separate home link. Keep the visible `뒤로` label at narrow/mobile widths instead of collapsing it to an easy-to-miss icon.
- Consequences: hard refresh still demonstrates the `다나와 → 도나와` animation, while logo navigation and back navigation are immediate. No session/local storage survives a reload, and route headers now expose both history return and explicit home navigation.

## 2026-08-13 — Pair nearby stores with an automatically expiring expo carousel
- Context: the home nearby-store entry used the full content width, while upcoming reptile/exotic-animal events had no first-class discovery surface.
- Decision: split the home utility area into equal desktop columns: nearby stores on the left and an image-led event carousel on the right. Advance one banner left every three seconds, pause for hover/focus, respect reduced motion, and stack the modules on narrow screens. Keep an event visible through its final date in Asia/Seoul and remove it beginning the next Korean calendar day. Every card links to a separately verified public event page; event data and images remain independent from price listings.
- Consequences: four currently verified events appear without inflating the price or shop databases. Expiration is deterministic at render time, the empty-event state collapses back to a single nearby-store card, and adding an event requires source/image provenance in `public/expos/ATTRIBUTION.md`.

## 2026-08-14 — Decouple home minimum prices from mid-market representative photos
- Context: binding every home photo to the absolute cheapest listing made the visual catalog repetitive, especially because one listing can belong to several overlapping morph and keyword groups. The cheapest image was also not necessarily the clearest representative of the group.
- Decision: keep the card amount as the absolute current minimum, but choose its photo from the image-bearing listing whose price is closest to the full category median. Resolve categories in their final display order and exclude both listing IDs and exact image URLs already selected by earlier cards. Prefer the lower-priced candidate when two prices are equally distant from an even-sized median; use stable ID order as the final tie-breaker. Fall back to the curated category photo only when no unused listing image remains or the remote image fails.
- Consequences: pricing stays useful for bargain discovery while the visual catalog uses more typical, non-repeated animals. The rule changes only home discovery imagery; detail-page listing cards still preserve strict image provenance and show `이미지 없음` rather than borrowing another photo.
