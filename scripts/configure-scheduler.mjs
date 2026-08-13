const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const collectorSecret = process.env.CRON_SECRET;

if (!projectUrl || !collectorSecret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL (.env.local) and CRON_SECRET (.env.collectors) are required");
  process.exit(1);
}

const response = await fetch(`${projectUrl}/functions/v1/collect-public-shops`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-collector-secret": collectorSecret,
  },
  body: JSON.stringify({ configureScheduler: true }),
});
const result = await response.json().catch(() => ({
  ok: false,
  error: "Invalid scheduler configuration response",
}));

if (!response.ok || !result.ok) {
  console.error(JSON.stringify({
    ok: false,
    status: response.status,
    error: result.error ?? "Scheduler configuration failed",
  }));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, schedulerConfigured: true }));
