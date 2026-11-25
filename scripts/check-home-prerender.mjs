import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
assert.equal(manifest.routes["/"]?.initialRevalidateSeconds, 300,
  "The home route must serve prebuilt HTML and refresh after five minutes.");

// CI builds with the bundled listings. Check for an actual price card in initial HTML.
const html = readFileSync(".next/server/app/index.html", "utf8");
assert.match(html, /class="morph-card__market"/, "The first response must contain the catalog.");
assert.doesNotMatch(html, /<section[^>]*class="brand-intro\b/, "A splash screen covers the catalog.");
