import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function argument(name) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizedPrice(value) {
  if (!value.trim()) return undefined;
  const number = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined;
}

const file = argument("file");
const defaultPlatform = argument("platform");
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const collectorSecret = process.env.CRON_SECRET;

if (!file || !projectUrl || !collectorSecret) {
  console.error("Usage: npm run import:listings -- --file=/absolute/path.csv [--platform=파사모|동물다락]");
  process.exit(1);
}

const csv = await readFile(resolve(file), "utf8");
const [headers, ...values] = parseCsv(csv);
const keys = headers.map((header) => header.trim().toLowerCase());
const objects = values.map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index]?.trim() ?? ""])));
const groups = new Map();

for (const item of objects) {
  const platform = item.platform || defaultPlatform;
  if (!platform) throw new Error("Every row needs a platform column or --platform");
  const listing = {
    title: item.title,
    url: item.url,
    price: normalizedPrice(item.price),
    priceType: item.price_type || undefined,
    status: item.status || "ACTIVE",
    morph: item.morph || undefined,
    traits: item.traits ? item.traits.split("|").map((value) => value.trim()).filter(Boolean) : [],
    sex: item.sex || "UNKNOWN",
    weightG: item.weight_g ? Number(item.weight_g) : undefined,
    imageUrl: item.image_url || undefined,
    classificationMode: item.classification_mode || undefined,
    statusEvidence: item.status_evidence || undefined,
  };
  groups.set(platform, [...(groups.get(platform) ?? []), listing]);
}

for (const [platform, listings] of groups) {
  for (let offset = 0; offset < listings.length; offset += 40) {
    const batch = listings.slice(offset, offset + 40);
    const response = await fetch(`${projectUrl}/functions/v1/import-listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-collector-secret": collectorSecret,
      },
      body: JSON.stringify({ platform, listings: batch }),
    });
    const result = await response.json().catch(() => ({ error: "Invalid importer response" }));
    console.log(JSON.stringify({
      platform,
      batch: `${offset + 1}-${offset + batch.length}`,
      ...result,
    }, null, 2));
    if (!response.ok) {
      process.exitCode = 1;
      break;
    }
  }
}
