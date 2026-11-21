import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error plain JS Vercel function
import { GET } from "../../api/food-lookup.js";

const realFetch = globalThis.fetch;

test("site lookup searches Open Food Facts with a descriptive User-Agent and UK filter", async () => {
  const calls: { url: string; ua: string | null }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, ua: new Headers(init?.headers).get("User-Agent") });
    return new Response(JSON.stringify({ products: [{ product_name: "Caramac", brands: "Nestle" }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const res = await GET(new Request("https://x.test/api/food-lookup?q=Caramac"));
    const json = await res.json();
    assert.equal(json.products[0].product_name, "Caramac");
    assert.match(calls[0].url, /search_terms=Caramac/);
    assert.match(calls[0].url, /united-kingdom/);
    assert.match(calls[0].ua ?? "", /DAILY15/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("site lookup falls back to the newer search service, and reports failure", async () => {
  let n = 0;
  globalThis.fetch = (async () => {
    n++;
    return n === 1 ? new Response("busy", { status: 503 }) : new Response(JSON.stringify({ hits: [{ product_name: "Caramac" }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const ok = await (await GET(new Request("https://x.test/api/food-lookup?q=Caramac"))).json();
    assert.equal(ok.products[0].product_name, "Caramac");
    globalThis.fetch = (async () => new Response("down", { status: 500 })) as typeof fetch;
    const bad = await GET(new Request("https://x.test/api/food-lookup?q=Caramac"));
    assert.equal(bad.status, 502);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("barcode lookup returns null for unknown products", async () => {
  globalThis.fetch = (async () => new Response("{}", { status: 404 })) as typeof fetch;
  try {
    const json = await (await GET(new Request("https://x.test/api/food-lookup?code=5000159484695"))).json();
    assert.equal(json.product, null);
  } finally {
    globalThis.fetch = realFetch;
  }
});
