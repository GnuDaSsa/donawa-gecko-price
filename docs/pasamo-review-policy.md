# Pasamo Per-Individual Review Policy

Updated: 2026-08-09 (Asia/Seoul)

## Scope

Pasamo is a user-authorized, bounded browser-review source. It is not an unattended crawler. The repeatable route is `scripts/pasamo-review.mjs`, a user-invoked Playwright review runner with a separate persistent Chrome profile. It may inspect only the explicitly requested 1–3 current board pages, at a minimum 1.2-second article delay, and must never be attached to cron, CI, a background monitor, or a private API.

The correct board is cafe `12440585`, menu `1704`, titled `크레스티드 게코 분양 게시판[임시]`. On 2026-08-09 its newest page exposed 20 non-notice articles plus pagination beyond page 10. This proves that the legacy ten-URL audit was not board-wide coverage.

The runner keeps full article text in browser memory only long enough to produce item candidates. It writes no HTML or raw body. Phone, email, chat link, address, seller, account, breeder/seller provenance, and delivery details are discarded before output.

## Repeatable Review Runner

1. Run `npm run pasamo:login` and complete login/2FA/CAPTCHA yourself in the dedicated Chrome window.
2. Run `npm run pasamo:review -- --acknowledge-boundary --pages=1`.
3. Inspect `output/pasamo/*-ready.csv`, `*-needs-review.csv`, and `*-audit.json`.
4. `ready.csv` contains only active, explicitly item-priced rows. `needs-review.csv` receives bundle-only, contact/unknown price, reservation, status exceptions, and unit-inferred rows.
5. Add `--apply` only when the ready set should be upserted to Supabase. The importer still enforces the host allowlist and status-evidence contract.

Profile/auth data stays at `~/.codex/browser-profiles/donawa-pasamo` by default and is never committed. If login, membership, CAPTCHA, or permission fails, stop and require the user to resolve it; do not bypass the gate.

## Item Identity

- One article with multiple animals becomes one row per animal.
- Identity is `canonical article URL + stable item fragment`, for example `.../5608467#lilly-baby-3`.
- The full URL including the fragment is hashed for `external_id`, so re-import updates the same individual without overwriting siblings.
- Preserve the last explicit asking price. Do not divide bundles or infer a missing individual price.
- Store a per-item image only when the article clearly maps that image to that item. Otherwise leave `image_url` empty.

## Morph Classification

| Mode | Use |
|---|---|
| `AUTO` | Dictionary may use the reviewed title and optional morph field. |
| `EXPLICIT` | Match only the reviewer-provided visual morph. Use when the post clearly names it. |
| `UNCLASSIFIED` | Store the animal/price/status but force `morph_id = null`. Use for Normal/Charcoal or ambiguous genetics such as `헷100릴리` when the visual morph is not safe to assert. |

## Status Decision Table

| Visible evidence | Stored status | `status_evidence` | Price comparison |
|---|---|---|---|
| Current item block has an offer/price and no completion marker | `ACTIVE` | `VISIBLE_OFFER_NO_COMPLETION` | Included only for fixed price + classified morph |
| The seller explicitly marks that item `분양완료`, `판매완료`, or `거래완료` | `SOLD` | `EXPLICIT_ITEM_SOLD` | Excluded; last asking price retained |
| The seller explicitly marks the entire article completed | `SOLD` | `EXPLICIT_ARTICLE_SOLD` | Excluded for every remaining item |
| The seller explicitly marks an item reserved | `UNKNOWN` | `EXPLICIT_RESERVATION` | Excluded until re-reviewed |
| The article is explicitly not found/deleted | `DELETED` | `ARTICLE_NOT_FOUND` | Excluded; deletion is not called a sale |
| The article is accessible but has not been re-reviewed past the freshness policy | `STALE` | `AGED_UNREVIEWED` | Excluded; age alone is not a sale |
| Login/permission state prevents a reliable read | `UNKNOWN` | `ACCESS_UNCONFIRMED` | Excluded; never guess |

### Important false-positive rules

- A strikethrough on the **old price only** followed by a visible discounted price is still ACTIVE.
- Phrases such as `먹이 붙힘 완료`, template warnings, comments from non-sellers, post age, and disappearance from a search result do not prove SOLD.
- `SOLD` imports are rejected by the Edge Function unless item/article completion evidence is supplied.
- `예약` is not a completed sale and currently maps to UNKNOWN because the schema has no RESERVED state.

## Legacy Imported-URL Audit (Not the Whole Board)

`docs/reviewed-imports/pasamo-2026-08-09-full-audit.csv` covers all ten Pasamo articles that were already represented in the database at that time. It does **not** cover the whole sale board:

- 46 distinct animals
- 45 ACTIVE, one explicitly SOLD
- 45 numeric rows, one CONTACT-only row
- 30 explicitly classified, 16 deliberately unclassified
- 44 current fixed-price rows and 28 current comparable rows after import
- zero stored article bodies, seller names, contact details, addresses, or per-item images without verified mapping

The only SOLD row in this audit is article 5608527's Lilly Axanthic baby, whose item block says `분양완료`. Article 5608469 remains ACTIVE: its strike tags cover only the old prices and each row still exposes a final discounted asking price.

## Latest Board Page 1 Batch (Not the Whole Board)

The canonical `2026-08-09 11:58 KST` batch is:

- `docs/reviewed-imports/pasamo-2026-08-09-1158-board-page1-ready.csv`
- `docs/reviewed-imports/pasamo-2026-08-09-1158-board-page1-needs-review.csv`
- `docs/reviewed-imports/pasamo-2026-08-09-1158-board-page1-audit.json`

It covers the 20 newest non-notice articles visible on menu `1704` page 1 at that run:

- 93 active fixed-price individuals imported from 13 articles
- 9 rows held for review: four missing explicit item prices, one ambiguous article-level price, one bundle-only price, one non-active/unknown state, one inferred item-price unit, and one inferred bundle-price unit
- 3 free offers excluded from price comparison
- 0 article-open failures
- 0 stored raw bodies, descriptions, seller names, phone/email patterns, addresses, or chat links

All 93 ready rows use stable item-fragment URLs. A second import of the same CSV left listing, price-history, and status-history counts unchanged, proving the batch is idempotent. These figures describe only that run's newest page 1; newer posts can shift page contents immediately.
