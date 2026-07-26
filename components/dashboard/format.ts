export function usd(value: number, min = 0, max = 2): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function trimTrailingZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/**
 * Compact number formatting ("4.2K", "184K", "1.25M").
 *
 * Deliberately hand-rolled rather than using `Intl.NumberFormat` with
 * `notation: "compact"`: Node's ICU pads to maximumFractionDigits (`41.00K`)
 * while Chromium trims trailing zeros (`41K`), so the ICU version produces
 * different output on the server and the client and breaks hydration.
 */
export function compactNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  const units: Array<[number, string]> = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];

  for (const [threshold, suffix] of units) {
    if (abs >= threshold) {
      const scaled = abs / threshold;
      // Keep roughly three significant digits.
      const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
      return `${sign}${trimTrailingZeros(scaled.toFixed(digits))}${suffix}`;
    }
  }

  return `${sign}${trimTrailingZeros(abs.toFixed(Number.isInteger(abs) ? 0 : 2))}`;
}

export function compactUsd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${compactNumber(Math.abs(value))}`;
}

export function signed(value: number, digits = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}
