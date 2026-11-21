// Vercel function: Open Food Facts product search and barcode lookup for the app.
// Same origin as the web app, so the browser needs no cross-site permission, and
// it works whether or not the user is signed in. Only the search term or barcode
// is sent to Open Food Facts; no user data.

const UA = "DAILY15/0.1 (fitness and food diary app; https://github.com/TomCarewSuperco/Daily-15)";
const FIELDS = "code,product_name,product_name_en,brands,nutriments,serving_quantity,quantity";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

async function get(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctrl.signal });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(t);
  }
}

async function search(q) {
  const attempts = [];
  const params = new URLSearchParams({
    search_terms: q, search_simple: "1", action: "process", json: "1", page_size: "20",
    sort_by: "unique_scans_n", tagtype_0: "countries", tag_contains_0: "contains", tag_0: "united-kingdom", fields: FIELDS,
  });
  try {
    const r = await get(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, 9000);
    attempts.push(`search.pl ${r.status}`);
    if (r.status === 200) {
      const json = JSON.parse(r.text);
      if (Array.isArray(json.products)) return { products: json.products, attempts };
    }
  } catch (e) {
    attempts.push(`search.pl ${e?.name ?? "error"}`);
  }
  try {
    const p2 = new URLSearchParams({ q: `${q} countries_tags:"en:united-kingdom"`, page_size: "20", fields: FIELDS });
    const r = await get(`https://search.openfoodfacts.org/search?${p2}`, 7000);
    attempts.push(`search-a-licious ${r.status}`);
    if (r.status === 200) {
      const json = JSON.parse(r.text);
      return { products: Array.isArray(json.hits) ? json.hits : [], attempts };
    }
  } catch (e) {
    attempts.push(`search-a-licious ${e?.name ?? "error"}`);
  }
  return { products: null, attempts };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").replace(/\D/g, "").slice(0, 14);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const headers = { ...cors, "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
  if (code) {
    if (code.length < 8) return Response.json({ product: null }, { headers });
    try {
      const r = await get(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, 9000);
      if (r.status === 404) return Response.json({ product: null }, { headers });
      if (r.status !== 200) return Response.json({ error: `upstream ${r.status}` }, { status: 502, headers: cors });
      const json = JSON.parse(r.text);
      return Response.json({ product: json.status === 1 ? json.product : null }, { headers });
    } catch (e) {
      return Response.json({ error: e?.name ?? "error" }, { status: 504, headers: cors });
    }
  }
  if (q.length < 2) return Response.json({ products: [] }, { headers });
  const result = await search(q);
  if (!result.products) return Response.json({ error: "upstream", attempts: result.attempts }, { status: 502, headers: cors });
  return Response.json({ products: result.products }, { headers });
}
