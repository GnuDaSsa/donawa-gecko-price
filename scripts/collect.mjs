const rawLimit = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const limit = rawLimit ? Number(rawLimit) : 48;
const source = process.argv.find((arg) => arg.startsWith("--source="))?.split("=")[1] ?? "all";
const rawSites = process.argv.find((arg) => arg.startsWith("--sites="))?.split("=")[1];
const sites = rawSites ? rawSites.split(",").map((site) => site.trim()).filter(Boolean) : undefined;
const rawOffset = process.argv.find((arg) => arg.startsWith("--offset="))?.split("=")[1];
const myBreedersOffset = rawOffset ? Number(rawOffset) : undefined;
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const collectorSecret = process.env.CRON_SECRET;

if (!projectUrl || !collectorSecret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL (.env.local) and CRON_SECRET (.env.collectors) are required");
  process.exit(1);
}

const functions = source === "all"
  ? ["collect-feedle", "collect-public-shops"]
  : source === "feedle"
    ? ["collect-feedle"]
    : source === "shops"
      ? ["collect-public-shops"]
      : [];

if (functions.length === 0) {
  console.error("--source must be all, feedle, or shops");
  process.exit(1);
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function discoverMyBreedersUrls() {
  if (sites && !sites.includes("mybreeders")) return undefined;
  const headers = { "User-Agent": "MorphPickPrivateMVP/0.2 (permitted public pages)" };
  const response = await fetch("https://mybreeders.com/sitemap.xml", {
    headers,
  });
  if (!response.ok) throw new Error(`MyBreeders sitemap returned ${response.status}`);
  const xml = await response.text();
  const rows = [];

  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const location = decodeXml(match[1].match(/<loc>([\s\S]*?)<\/loc>/i)?.[1] ?? "").trim();
    const lastModified = match[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim();
    try {
      const url = new URL(location);
      if (
        url.protocol === "https:" &&
        url.hostname === "mybreeders.com" &&
        /^\/product\/[A-Za-z0-9_-]+$/.test(url.pathname)
      ) {
        rows.push({
          url: url.toString(),
          lastModified: lastModified ? Date.parse(lastModified) || 0 : 0,
        });
      }
    } catch {
      // Ignore malformed sitemap locations.
    }
  }

  let urls = rows
    .sort((a, b) => b.lastModified - a.lastModified || a.url.localeCompare(b.url))
    .map((row) => row.url);

  if (urls.length === 0) {
    const homepageResponse = await fetch("https://mybreeders.com/", { headers });
    if (!homepageResponse.ok) {
      throw new Error(`MyBreeders homepage returned ${homepageResponse.status}`);
    }
    const decodedRsc = (await homepageResponse.text()).replaceAll(String.raw`\"`, `"`);
    const markerIndex = decodedRsc.indexOf(`"initialProductPage":`);
    if (markerIndex >= 0) {
      const discovered = new Set();
      for (const match of decodedRsc.slice(markerIndex).matchAll(/"productNo":"([A-Za-z0-9_-]+)"/g)) {
        discovered.add(`https://mybreeders.com/product/${match[1]}`);
      }
      urls = [...discovered];
    }
  }

  const offset = Number.isFinite(myBreedersOffset) ? Math.max(0, myBreedersOffset) : 0;
  return urls.slice(offset, offset + limit);
}

const myBreedersUrls = functions.includes("collect-public-shops")
  ? await discoverMyBreedersUrls()
  : undefined;

let failed = false;
for (const functionName of functions) {
  const response = await fetch(`${projectUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-collector-secret": collectorSecret,
    },
    body: JSON.stringify({ limit, sites, myBreedersOffset, myBreedersUrls }),
  });
  const result = await response.json().catch(() => ({ error: "Invalid collector response" }));
  console.log(JSON.stringify({ collector: functionName, ...result }, null, 2));
  if (!response.ok) failed = true;
}

if (failed) process.exit(1);
