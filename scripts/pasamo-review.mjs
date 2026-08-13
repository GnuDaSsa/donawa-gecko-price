import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { parsePasamoArticle, toPasamoCsv } from "../lib/pasamo-parser.mjs";

const CAFE_ID = "12440585";
const MENU_ID = "1704";
const BOARD_URL = `https://cafe.naver.com/f-e/cafes/${CAFE_ID}/menus/${MENU_ID}?viewType=I`;
const LOGIN_URL = `https://nid.naver.com/nidlogin.login?url=${encodeURIComponent(BOARD_URL)}`;
const DEFAULT_PROFILE = join(homedir(), ".codex", "browser-profiles", "donawa-pasamo");

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function intArgument(name, fallback, { min, max }) {
  const raw = argument(name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`--${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function stampKst() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date()).replace(" ", "T").replaceAll(":", "-");
}

async function hasNaverSession(context) {
  const cookies = await context.cookies("https://naver.com", "https://cafe.naver.com");
  return cookies.some((cookie) => cookie.name === "NID_AUT" || cookie.name === "NID_SES");
}

async function launch(profileDir, headless) {
  await mkdir(profileDir, { recursive: true });
  return chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless,
    viewport: { width: 1440, height: 1000 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
}

async function launchAuthorized(profileDir, headless) {
  const statePath = join(profileDir, "storage-state.json");
  await access(statePath).catch(() => {
    throw new Error("저장된 네이버 인증 state가 없습니다. 먼저 npm run pasamo:login 을 실행하세요.");
  });
  const browser = await chromium.launch({ channel: "chrome", headless });
  const context = await browser.newContext({
    storageState: statePath,
    viewport: { width: 1440, height: 1000 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  return { browser, context, statePath };
}

async function login(profileDir) {
  const context = await launch(profileDir, false);
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
  console.log("[pasamo] 열린 Chrome에서 네이버 로그인을 직접 완료하세요. 비밀번호·2FA·CAPTCHA는 이 스크립트가 입력하지 않습니다.");

  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    if (await hasNaverSession(context)) {
      await page.goto(BOARD_URL, { waitUntil: "domcontentloaded" });
      const title = page.locator("h3.sub-tit-color", { hasText: "크레스티드 게코 분양 게시판" });
      await title.waitFor({ state: "visible", timeout: 20_000 });
      await context.storageState({ path: join(profileDir, "storage-state.json"), indexedDB: true });
      console.log(`[pasamo] 로그인 프로필과 게시판 접근을 확인했습니다: ${profileDir}`);
      await context.close();
      return;
    }
    await page.waitForTimeout(2_000);
  }

  await context.close();
  throw new Error("5분 안에 로그인 상태를 확인하지 못했습니다. npm run pasamo:login 을 다시 실행하세요.");
}

async function boardListings(page) {
  await page.waitForFunction(() => {
    const links = document.querySelectorAll('a[href*="/f-e/cafes/12440585/articles/"]');
    return links.length >= 10;
  }, undefined, { timeout: 20_000 });

  return page.evaluate(() => {
    const containers = [
      ...document.querySelectorAll("ul.article-album-view > li.item"),
      ...document.querySelectorAll("table.article-table tbody tr:not(.board-notice)"),
    ];
    const found = new Map();

    for (const container of containers) {
      const articleAnchors = [...container.querySelectorAll('a[href*="/f-e/cafes/12440585/articles/"]')];
      for (const anchor of articleAnchors) {
        const match = anchor.href.match(/\/articles\/(\d+)/);
        if (!match) continue;
        const sameArticle = articleAnchors.filter((candidate) => candidate.href.includes(`/articles/${match[1]}`));
        const title = sameArticle
          .map((candidate) => (candidate.textContent || "").replace(/\s+/g, " ").trim())
          .filter((value) => value && !/^댓글수/.test(value))
          .sort((left, right) => right.length - left.length)[0];
        if (!title) continue;
        found.set(match[1], {
          articleId: match[1],
          title,
          url: `https://cafe.naver.com/f-e/cafes/12440585/articles/${match[1]}`,
        });
      }
    }
    return [...found.values()];
  });
}

async function collectBoardPages(page, pages) {
  await page.goto(BOARD_URL, { waitUntil: "domcontentloaded" });
  const heading = page.locator("h3.sub-tit-color", { hasText: "크레스티드 게코 분양 게시판" });
  await heading.waitFor({ state: "visible", timeout: 20_000 });

  const listings = [];
  let currentFirst;
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    if (pageNumber > 1) {
      const previousFirst = currentFirst;
      const pager = page.locator(".Pagination");
      const button = pager.getByRole("button", { name: String(pageNumber), exact: true });
      if (await button.count() !== 1) {
        throw new Error(`게시판 ${pageNumber} 페이지 버튼을 찾지 못했습니다. 한 실행은 최대 3페이지만 지원합니다.`);
      }
      await button.click();
      await page.waitForFunction((first) => {
        const href = document.querySelector('ul.article-album-view a[href*="/articles/"], table.article-table tbody tr:not(.board-notice) a[href*="/articles/"]')?.href;
        return Boolean(href && !href.includes(`/articles/${first}`));
      }, previousFirst, { timeout: 20_000 });
    }
    const rows = await boardListings(page);
    if (rows.length === 0) throw new Error(`게시판 ${pageNumber} 페이지에서 일반 글을 찾지 못했습니다.`);
    currentFirst = rows[0].articleId;
    listings.push(...rows);
  }
  return [...new Map(listings.map((listing) => [listing.articleId, listing])).values()];
}

async function readArticle(page, listing) {
  await page.goto(listing.url, { waitUntil: "domcontentloaded" });
  const iframe = await page.waitForSelector("iframe#cafe_main", { timeout: 20_000 });
  const frame = await iframe.contentFrame();
  if (!frame) throw new Error("cafe_main iframe에 접근하지 못했습니다.");
  await frame.locator(".se-main-container").waitFor({ state: "visible", timeout: 20_000 });
  const title = normalizeTitle(await frame.locator(".ArticleTitle h3").textContent().catch(() => listing.title));
  const paragraphs = await frame.locator(".se-main-container").evaluate((root) =>
    [...root.querySelectorAll(".se-text-paragraph")].map((node) => node.textContent || "")
  );
  return parsePasamoArticle({
    articleId: listing.articleId,
    title: title || listing.title,
    url: listing.url,
    paragraphs,
  });
}

function normalizeTitle(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function publicAudit(result) {
  return {
    articleId: result.articleId,
    title: result.title,
    readyCount: result.ready.length,
    reviewCount: result.review.length,
    excludedCount: result.excluded.length,
    reviewReasons: [...new Set(result.review.map((row) => row.review_reason))],
    excludedReasons: [...new Set(result.excluded.map((row) => row.reason))],
  };
}

async function applyReadyRows(rows) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const collectorSecret = process.env.CRON_SECRET;
  if (!projectUrl || !collectorSecret) {
    throw new Error("--apply에는 .env.local의 NEXT_PUBLIC_SUPABASE_URL과 .env.collectors의 CRON_SECRET이 필요합니다.");
  }
  const results = [];
  for (let offset = 0; offset < rows.length; offset += 40) {
    const batch = rows.slice(offset, offset + 40);
    const response = await fetch(`${projectUrl}/functions/v1/import-listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-collector-secret": collectorSecret,
      },
      body: JSON.stringify({
        platform: "파사모",
        listings: batch.map((row) => ({
          title: row.title,
          url: row.url,
          price: Number(row.price),
          priceType: row.price_type,
          status: row.status,
          morph: row.morph || undefined,
          traits: row.traits ? row.traits.split("|") : [],
          sex: row.sex,
          weightG: row.weight_g === "" ? undefined : Number(row.weight_g),
          classificationMode: row.classification_mode,
          statusEvidence: row.status_evidence,
        })),
      }),
    });
    const body = await response.json().catch(() => ({ error: "invalid JSON response" }));
    if (!response.ok) throw new Error(`Supabase import failed (${response.status}): ${JSON.stringify(body)}`);
    results.push(body);
  }
  return { requested: rows.length, batches: results };
}

async function review() {
  if (!hasFlag("acknowledge-boundary")) {
    throw new Error("네이버 robots.txt의 전체 자동수집 금지와 프로젝트 경계를 확인한 뒤 --acknowledge-boundary를 명시하세요. 이 도구는 사용자 실행형, 최대 3페이지, 저속 검수 전용이며 스케줄러에 연결하지 않습니다.");
  }
  if (process.env.CI) throw new Error("파사모 review runner는 CI/백그라운드에서 실행할 수 없습니다.");

  const pages = intArgument("pages", 1, { min: 1, max: 3 });
  const delayMs = intArgument("delay-ms", 1_500, { min: 1_200, max: 10_000 });
  const profileDir = resolve(argument("profile") || DEFAULT_PROFILE);
  const outputDir = resolve(argument("output") || "output/pasamo");
  const { browser, context, statePath } = await launchAuthorized(profileDir, hasFlag("headless"));

  try {
    if (!await hasNaverSession(context)) {
      throw new Error("전용 Playwright 프로필에 네이버 로그인이 없습니다. 먼저 npm run pasamo:login 을 실행하세요.");
    }
    const page = context.pages()[0] ?? await context.newPage();
    const listings = await collectBoardPages(page, pages);
    const results = [];
    const failures = [];

    for (const [index, listing] of listings.entries()) {
      try {
        results.push(await readArticle(page, listing));
      } catch (error) {
        failures.push({ articleId: listing.articleId, title: listing.title, error: String(error) });
      }
      if (index < listings.length - 1) await page.waitForTimeout(delayMs);
    }

    const ready = results.flatMap((result) => result.ready);
    const needsReview = results.flatMap((result) => result.review);
    const stamp = stampKst();
    await mkdir(outputDir, { recursive: true });
    const readyPath = join(outputDir, `pasamo-${stamp}-ready.csv`);
    const reviewPath = join(outputDir, `pasamo-${stamp}-needs-review.csv`);
    const auditPath = join(outputDir, `pasamo-${stamp}-audit.json`);
    await writeFile(readyPath, toPasamoCsv(ready), "utf8");
    await writeFile(reviewPath, toPasamoCsv(needsReview), "utf8");
    await writeFile(auditPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      board: { cafeId: CAFE_ID, menuId: MENU_ID, pages, articleCount: listings.length },
      counts: { ready: ready.length, needsReview: needsReview.length, failedArticles: failures.length },
      articles: results.map(publicAudit),
      failures,
    }, null, 2) + "\n", "utf8");

    let applied;
    if (hasFlag("apply")) applied = await applyReadyRows(ready);
    console.log(JSON.stringify({
      boardArticles: listings.length,
      ready: ready.length,
      needsReview: needsReview.length,
      failedArticles: failures.length,
      readyPath,
      reviewPath,
      auditPath,
      applied: applied ?? false,
    }, null, 2));
  } finally {
    await context.storageState({ path: statePath, indexedDB: true }).catch(() => undefined);
    await context.close();
    await browser.close();
  }
}

const mode = argument("mode") || "review";
if (mode === "login") await login(resolve(argument("profile") || DEFAULT_PROFILE));
else if (mode === "review") await review();
else throw new Error("--mode must be login or review");
