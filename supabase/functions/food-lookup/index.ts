// Proxy for Open Food Facts product search and barcode lookup.
// Runs server side so requests identify the app (Open Food Facts asks for a
// descriptive User-Agent), avoid browser cross-origin limits, and can wait
// longer for the slow name search. Signed-in users only (verify_jwt).
// No user data is sent: only the search term or barcode.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "DAILY15/0.1 (fitness and food diary app; https://github.com/TomCarewSuperco/Daily-15)";
const FIELDS = "code,product_name,product_name_en,brands,nutriments,serving_quantity,quantity";

async function get(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

async function search(q: string) {
  const params = new URLSearchParams({
    search_terms: q, search_simple: "1", action: "process", json: "1", page_size: "20",
    sort_by: "unique_scans_n", tagtype_0: "countries", tag_contains_0: "contains", tag_0: "united-kingdom", fields: FIELDS,
  });
  const attempts: string[] = [];
  try {
    const r = await get(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, 12_000);
    attempts.push(`search.pl ${r.status}`);
    if (r.status === 200) {
      const json = JSON.parse(r.text);
      if (Array.isArray(json.products)) return { products: json.products, source: "search.pl", attempts };
    }
  } catch (e) {
    attempts.push(`search.pl error ${e instanceof Error ? e.name : "unknown"}`);
  }
  // Newer search service as a fallback.
  try {
    const p2 = new URLSearchParams({ q: `${q} countries_tags:"en:united-kingdom"`, page_size: "20", fields: FIELDS });
    const r = await get(`https://search.openfoodfacts.org/search?${p2}`, 8_000);
    attempts.push(`search-a-licious ${r.status}`);
    if (r.status === 200) {
      const json = JSON.parse(r.text);
      const hits = Array.isArray(json.hits) ? json.hits : [];
      return { products: hits, source: "search-a-licious", attempts };
    }
  } catch (e) {
    attempts.push(`search-a-licious error ${e instanceof Error ? e.name : "unknown"}`);
  }
  return { products: null, attempts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: { q?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  if (body.code) {
    const code = String(body.code).replace(/\D/g, "").slice(0, 14);
    if (code.length < 8) return Response.json({ product: null }, { headers: cors });
    try {
      const r = await get(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, 10_000);
      console.log(`barcode ${code}: ${r.status}`);
      if (r.status === 404) return Response.json({ product: null }, { headers: cors });
      if (r.status !== 200) return Response.json({ error: `upstream ${r.status}` }, { status: 502, headers: cors });
      const json = JSON.parse(r.text);
      return Response.json({ product: json.status === 1 ? json.product : null }, { headers: cors });
    } catch (e) {
      console.log(`barcode ${code}: error ${e instanceof Error ? e.name : "unknown"}`);
      return Response.json({ error: "timeout" }, { status: 504, headers: cors });
    }
  }
  const q = String(body.q ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ products: [] }, { headers: cors });
  const result = await search(q);
  console.log(`search "${q}": ${result.attempts.join(", ")}`);
  if (!result.products) return Response.json({ error: "upstream unavailable", attempts: result.attempts }, { status: 502, headers: cors });
  return Response.json({ products: result.products, source: result.source }, { headers: cors });
});
