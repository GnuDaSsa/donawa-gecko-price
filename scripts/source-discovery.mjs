const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const collectorSecret = process.env.CRON_SECRET;
if (!projectUrl || !collectorSecret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL (.env.local) and CRON_SECRET (.env.collectors) are required");
  process.exit(1);
}

const rawMode = process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1];
const modes = {
  discover: "discover",
  list: "list",
  openai: "discover-openai",
  "price-candidates": "list-price-evidence",
};
const mode = modes[rawMode ?? "discover"];
if (!mode) {
  console.error("--mode must be discover, list, openai, or price-candidates");
  process.exit(1);
}
const status = process.argv.find((arg) => arg.startsWith("--status="))?.split("=")[1];
const rawLimit = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const parsedLimit = rawLimit ? Number(rawLimit) : 50;
const limit = Number.isFinite(parsedLimit)
  ? Math.max(1, Math.min(Math.floor(parsedLimit), 100))
  : 50;

const response = await fetch(`${projectUrl}/functions/v1/discover-public-sources`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-collector-secret": collectorSecret,
  },
  body: JSON.stringify({ mode, status, limit }),
});
const result = await response.json().catch(() => ({
  ok: false,
  error: "Invalid source-discovery response",
}));
console.log(JSON.stringify(result, null, 2));

if (!response.ok || !result.ok) process.exit(1);
if (result.skipped) process.exitCode = 2;
