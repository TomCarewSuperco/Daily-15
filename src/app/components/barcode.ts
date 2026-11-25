import type { Nutrients } from "../types";
import { supabase } from "../cloud/client";

/**
 * Calls the food-lookup function on Supabase, which asks Open Food Facts on the
 * app's behalf. Returns undefined if the function isn't available, so the
 * caller falls back to asking Open Food Facts directly.
 */
async function viaProxy<T>(body: Record<string, string>): Promise<T | undefined> {
  if (!supabase) return undefined;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return undefined;
  const { data, error } = await supabase.functions.invoke("food-lookup", { body });
  if (error) throw error;
  return data as T;
}

/**
 * The app's own lookup endpoint on Vercel (api/food-lookup.js). Same origin as
 * the web app; the native app calls the deployed site. Returns undefined if the
 * endpoint isn't there (local builds), so the caller tries the next route.
 */
const LOOKUP_URL =
  ((import.meta.env ?? {}) as Record<string, string | undefined>).VITE_LOOKUP_URL ||
  (typeof window !== "undefined" && window.location.protocol.startsWith("http") ? "/api/food-lookup" : "https://daily-15-tomcarewsupercos-projects.vercel.app/api/food-lookup");

async function viaSite<T>(params: Record<string, string>, signal?: AbortSignal): Promise<T | undefined> {
  const res = await fetch(`${LOOKUP_URL}?${new URLSearchParams(params)}`, { signal });
  if (res.status === 404 || !(res.headers.get("content-type") ?? "").includes("json")) return undefined;
  if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
  return (await res.json()) as T;
}

/*
 * Open Food Facts lookups. Product data is crowd-sourced, published under the
 * Open Database Licence (attribution shown in the UI) and treated as estimates.
 * Values are per 100 g or 100 ml.
 */

export interface OffProduct extends Nutrients {
  code: string;
  name: string;
  /** Grams in one serving, if the product states it. */
  servingG: number | null;
  /** Pack size as printed, e.g. '400 g'. */
  quantity: string | null;
  /** Pack size in grams (or ml), read from the label text or Open Food Facts. */
  packG: number | null;
  /** Sold by volume (the pack says ml, cl or litres): measured in millilitres. */
  liquid?: boolean;
  /** An alcoholic drink, from the listing's categories or name. */
  drink?: DrinkKind;
  /** Alcohol by volume, %; from the listing, or a typical figure for the kind of drink. */
  abv?: number;
  /** True when abv is the typical figure, not the listing's. */
  abvTypical?: boolean;
}

const FIELDS = "code,product_name,product_name_en,brands,nutriments,serving_quantity,serving_size,quantity,product_quantity,categories_tags";

interface RawProduct {
  code?: string;
  product_name?: string | Record<string, string>;
  product_name_en?: string;
  /** Text from the classic search; a list from the newer search service. */
  brands?: string | string[];
  nutriments?: Record<string, unknown>;
  serving_quantity?: number | string;
  /** As printed, e.g. '125 g' or '1 pot (125g)'. */
  serving_size?: string;
  quantity?: string;
  /** Pack size in grams or millilitres, when Open Food Facts has worked it out. */
  product_quantity?: number | string;
  categories_tags?: string[];
}

/** Grams (or ml) in label text such as '250g', '2 x 125 g', '1.5kg' or '1 pot (125g)'. */
export function gramsIn(text: string | undefined | null): number {
  if (!text) return 0;
  const t = text.toLowerCase().replace(",", ".");
  const m = t.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/);
  if (!m) return 0;
  const n = Number(m[2]) * (m[1] ? Number(m[1]) : 1);
  const f = m[3] === "kg" || m[3] === "l" ? 1000 : m[3] === "cl" ? 10 : 1;
  return Math.round(n * f);
}

export type DrinkKind = "beer" | "cider" | "wine" | "spirit";
/** Typical strength when a listing doesn't give one. */
const TYPICAL_ABV: Record<DrinkKind, number> = { beer: 4.5, cider: 4.5, wine: 12.5, spirit: 40 };

/** What kind of alcoholic drink a product is, from its categories, then its name. Alcohol-free drinks aren't. */
export function drinkKind(name: string, categories: string[] = []): DrinkKind | null {
  const c = categories.join(" ");
  const n = name.toLowerCase();
  if (/alcohol-?free|non-?alcoholic|0\.0|\bzero\b|low-alcohol|dealcoholi/.test(`${c} ${n}`)) return null;
  if (/en:ciders?\b/.test(c) || /\bcider\b/.test(n)) return "cider";
  if (/en:(beers|lagers|ales|stouts|pilsners|ipa|craft-beers)/.test(c) || /\b(beer|lager|ale|ipa|stout|porter|pilsner|bitter|pale ale|peroni|estrella|corona|heineken|stella artois|guinness|budweiser|birra moretti|san miguel|carlsberg|madri|asahi|kronenbourg|camden|brewdog|beavertown)\b/.test(n)) return "beer";
  if (/en:(wines|red-wines|white-wines|rose-wines|sparkling-wines|champagnes|proseccos)/.test(c) || /\b(wine|prosecco|champagne|cava|rioja|merlot|sauvignon|chardonnay|pinot|malbec|shiraz)\b/.test(n)) return "wine";
  if (/en:(spirits|gins|vodkas|whiskies|rums|liqueurs)/.test(c) || /\b(gin|vodka|whisky|whiskey|rum|brandy|tequila|liqueur)\b/.test(n)) return "spirit";
  return null;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
/** Undefined when the product doesn't state the value, so it isn't counted as zero. */
const opt = (v: unknown) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

function drinkFields(p: RawProduct, name: string): Pick<OffProduct, "liquid" | "drink" | "abv" | "abvTypical"> {
  const liquid = /\d\s*(ml|cl|l)\b/i.test(p.quantity ?? "") || /\d\s*(ml|cl)\b/i.test(p.serving_size ?? "");
  const kind = drinkKind(name, p.categories_tags ?? []);
  const n = p.nutriments ?? {};
  const listed = num(n.alcohol_100g) || num(n.alcohol_value) || num(n.alcohol);
  if (!kind) return liquid ? { liquid } : {};
  return { liquid: true, drink: kind, abv: listed > 0 && listed < 80 ? listed : TYPICAL_ABV[kind], ...(listed > 0 ? {} : { abvTypical: true }) };
}

function parse(p: RawProduct, fallbackCode = ""): OffProduct | null {
  const n = p.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
  const rawName = p.product_name_en || p.product_name || "";
  const title = (typeof rawName === "string" ? rawName : rawName.en ?? Object.values(rawName)[0] ?? "").trim();
  if (!title && !kcal) return null;
  const brand = (Array.isArray(p.brands) ? p.brands[0] : typeof p.brands === "string" ? p.brands.split(",")[0] : undefined)?.trim();
  const name = brand && !title.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${title}`.trim() : title;
  return {
    code: p.code ?? fallbackCode,
    name: name || `Product ${fallbackCode}`,
    servingG: (p.serving_quantity ? num(p.serving_quantity) : 0) || gramsIn(p.serving_size) || null,
    quantity: p.quantity?.trim() || null,
    packG: gramsIn(p.quantity) || (p.product_quantity ? num(p.product_quantity) : 0) || null,
    ...drinkFields(p, name || title),
    kcal: Math.round(kcal),
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    fibre: num(n.fiber_100g),
    satFat: opt(n["saturated-fat_100g"]),
    sugars: opt(n.sugars_100g),
    salt: opt(n.salt_100g),
  };
}

export async function lookupBarcode(code: string): Promise<OffProduct | null> {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 8) return null;
  try {
    const site = await viaSite<{ product: RawProduct | null }>({ code: clean });
    if (site) return site.product ? parse(site.product, clean) : null;
  } catch {
    /* try the next route */
  }
  try {
    const proxied = await viaProxy<{ product: RawProduct | null }>({ code: clean });
    if (proxied) return proxied.product ? parse(proxied.product, clean) : null;
  } catch {
    /* fall back to a direct request */
  }
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;
  return parse(json.product, clean);
}

/**
 * Full-text product search, limited to products sold in the UK. Open Food Facts
 * allows about ten searches a minute per user, so call this on an explicit
 * search, never on every keystroke.
 */
/**
 * The words worth sending: '&' and small words like 'and' go, because product
 * names write 'Pecan & Almond' and the search wants every word it's given.
 */
export function searchTerms(query: string): string {
  return query.replace(/&/g, " ").replace(/\bkitkat\b/gi, "kit kat").replace(/\b(and|with|the|of|in|a|n)\b/gi, " ").replace(/\s+/g, " ").trim();
}

/**
 * Searches branded products. If nothing matches every word, tries again without the
 * last word or two, so 'bio me pecan almond granola' can still find 'Bio&Me Pecan Granola'.
 */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const terms = searchTerms(query);
  const words = terms.split(" ");
  const tries = [terms, ...(words.length > 2 ? [words.slice(0, -1).join(" ")] : []), ...(words.length > 3 ? [words.slice(0, -2).join(" ")] : [])];
  for (const t of tries) {
    const found = await searchOnce(t, query, signal);
    if (found.length) return found;
  }
  return [];
}

async function searchOnce(term: string, original: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  // One oddly shaped product shouldn't lose the whole list.
  const safeParse = (p: RawProduct) => {
    try {
      return parse(p);
    } catch {
      return null;
    }
  };
  const keep = (products: RawProduct[]) => rankByQuery(products.map(safeParse).filter((p): p is OffProduct => !!p && p.kcal > 0), searchTerms(original));
  try {
    const site = await viaSite<{ products: RawProduct[] }>({ q }, signal);
    if (site) return keep(site.products ?? []);
  } catch (e) {
    if (signal?.aborted) throw e;
    /* try the next route */
  }
  try {
    const proxied = await viaProxy<{ products: RawProduct[] }>({ q });
    if (proxied) return keep(proxied.products ?? []);
  } catch {
    /* fall back to a direct request */
  }
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    sort_by: "unique_scans_n",
    tagtype_0: "countries",
    tag_contains_0: "contains",
    tag_0: "united-kingdom",
    fields: FIELDS,
  });
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const json = await res.json();
  return keep(Array.isArray(json.products) ? json.products : []);
}

/** Puts products that contain more of the words typed first, keeping the database order otherwise. */
export function rankByQuery<T extends { name: string }>(products: T[], q: string): T[] {
  const split = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const words = split(q);
  const score = (p: T) => {
    const nw = split(p.name);
    return words.filter((w) => nw.some((x) => x.startsWith(w))).length;
  };
  return products.map((p, i) => ({ p, i, s: score(p) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.p);
}

/* ---------- Camera scanning ---------- */

interface DetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

export function cameraAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

function nativeDetector(): DetectorLike | null {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) return null;
  const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => DetectorLike }).BarcodeDetector;
  try {
    return new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
  } catch {
    return null;
  }
}

/**
 * Opens the rear camera and resolves with the first EAN or UPC code seen.
 * Uses the browser's built-in detector where it exists (Chrome on Android)
 * and falls back to ZXing everywhere else, including Safari on iPhone.
 */
export async function scanWithCamera(video: HTMLVideoElement, signal: AbortSignal): Promise<string | null> {
  const native = nativeDetector();
  if (native) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    await video.play();
    try {
      while (!signal.aborted) {
        const codes = await native.detect(video).catch(() => []);
        if (codes.length) return codes[0].rawValue;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    } finally {
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  }

  // Loaded on demand so the scanner adds nothing to the initial download.
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
  const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });

  return new Promise<string | null>((resolve, reject) => {
    let controls: { stop: () => void } | null = null;
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      controls?.stop();
      video.srcObject = null;
      resolve(v);
    };
    signal.addEventListener("abort", () => finish(null), { once: true });
    reader
      .decodeFromConstraints({ video: { facingMode: "environment" } }, video, (result) => {
        if (result) finish(result.getText());
      })
      .then((c) => {
        controls = c;
        if (done) c.stop();
      })
      .catch((e) => {
        if (!done) {
          done = true;
          reject(e);
        }
      });
  });
}
