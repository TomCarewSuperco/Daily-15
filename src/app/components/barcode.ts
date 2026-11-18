import type { Nutrients } from "../types";

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
}

const FIELDS = "code,product_name,product_name_en,brands,nutriments,serving_quantity,quantity";

interface RawProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
  serving_quantity?: number | string;
  quantity?: string;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
/** Undefined when the product doesn't state the value, so it isn't counted as zero. */
const opt = (v: unknown) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

function parse(p: RawProduct, fallbackCode = ""): OffProduct | null {
  const n = p.nutriments ?? {};
  const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
  const title = (p.product_name_en || p.product_name || "").trim();
  if (!title && !kcal) return null;
  const brand = p.brands?.split(",")[0]?.trim();
  const name = brand && !title.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${title}`.trim() : title;
  return {
    code: p.code ?? fallbackCode,
    name: name || `Product ${fallbackCode}`,
    servingG: p.serving_quantity ? num(p.serving_quantity) || null : null,
    quantity: p.quantity?.trim() || null,
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
export async function searchProducts(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const q = query.trim();
  if (q.length < 2) return [];
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
  const products: RawProduct[] = Array.isArray(json.products) ? json.products : [];
  return products.map((p) => parse(p)).filter((p): p is OffProduct => !!p && p.kcal > 0);
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
