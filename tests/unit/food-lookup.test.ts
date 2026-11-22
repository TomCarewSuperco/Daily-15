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

test("app reads products from the newer search service, where brands is a list", async () => {
  const { searchProducts } = await import("../../src/app/components/barcode");
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ products: [
      { code: "1", product_name: "Natural Yogurt", brands: ["Yeo Valley"], nutriments: { "energy-kcal_100g": 82, proteins_100g: 4.7, carbohydrates_100g: 6, fat_100g: 4.2 } },
      { code: "2", product_name: { en: "Odd" }, brands: 7, nutriments: { "energy-kcal_100g": 50 } },
    ] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  try {
    const r = await searchProducts("natural yogurt");
    assert.equal(r[0].name, "Yeo Valley Natural Yogurt");
    assert.equal(r.length, 2);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("pack and serving sizes are read from label text", async () => {
  const { gramsIn } = await import("../../src/app/components/barcode");
  assert.equal(gramsIn("250g"), 250);
  assert.equal(gramsIn("2 x 125 g"), 250);
  assert.equal(gramsIn("1.5kg"), 1500);
  assert.equal(gramsIn("1 pot (125g)"), 125);
  assert.equal(gramsIn("33cl"), 330);
  assert.equal(gramsIn("Serves 2"), 0);
});

test("a branded meal with no serving size gets half pack, or a typical portion", async () => {
  const { dishUnitsFor } = await import("../../src/app/cofid");
  assert.equal(dishUnitsFor("Merchant Gourmet Lentil & Chickpea Tagine")[0].g, 200);
  assert.equal(dishUnitsFor("Heinz Cream of Tomato Soup")[0].name, "bowl");
  assert.deepEqual(dishUnitsFor("Something unusual"), []);
});
