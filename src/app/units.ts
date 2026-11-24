/** Body measurements are stored in centimetres and shown in the unit the person picked. */
export type LengthUnit = "cm" | "in";

export const CM_PER_INCH = 2.54;

/** A stored length in the chosen unit: centimetres to 0.1, inches to 0.25. */
export function fromCm(cm: number, unit: LengthUnit): number {
  return unit === "cm" ? Math.round(cm * 10) / 10 : Math.round((cm / CM_PER_INCH) * 4) / 4;
}

/** An entered length back to centimetres, to 0.1. */
export function toCm(value: number, unit: LengthUnit): number {
  return unit === "cm" ? Math.round(value * 10) / 10 : Math.round(value * CM_PER_INCH * 10) / 10;
}

export function formatLength(cm: number, unit: LengthUnit): string {
  const v = fromCm(cm, unit);
  return unit === "cm" ? `${v} cm` : `${v} in`;
}

/** A change, with its sign: '−2.5 cm', '+1 in'. */
export function formatLengthChange(cm: number, unit: LengthUnit): string {
  const v = fromCm(Math.abs(cm), unit);
  return `${cm > 0 ? "+" : cm < 0 ? "−" : ""}${v} ${unit}`;
}
