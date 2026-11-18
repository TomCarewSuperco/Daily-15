import type { Nutrients } from "../types";

export interface BarcodeProduct extends Nutrients {
  name: string;
  /** Grams in one serving, if the product states it. */
  servingG: number | null;
}

/**
 * Looks up a product on Open Food Facts. Values are per 100 g, crowd-sourced
 * and treated as estimates. Data is available under the Open Database Licence,
 * which requires attribution in the UI.
 */
export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 8) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,brands,nutriments,serving_quantity`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;
  const p = json.product;
  const n = p.nutriments ?? {};
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
  return {
    name: [p.brands?.split(",")[0], p.product_name].filter(Boolean).join(" ").trim() || `Product ${clean}`,
    servingG: p.serving_quantity ? num(p.serving_quantity) : null,
    kcal,
    protein: num(n.proteins_100g),
    carbs: num(n.carbohydrates_100g),
    fat: num(n.fat_100g),
    fibre: num(n.fiber_100g),
  };
}

interface DetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

export function barcodeDetectorAvailable(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;
}

/** Starts the rear camera and resolves with the first EAN or UPC code seen. */
export async function scanWithCamera(video: HTMLVideoElement, signal: AbortSignal): Promise<string | null> {
  const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => DetectorLike }).BarcodeDetector;
  const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  video.srcObject = stream;
  await video.play();
  try {
    while (!signal.aborted) {
      const codes = await detector.detect(video).catch(() => []);
      if (codes.length) return codes[0].rawValue;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}
