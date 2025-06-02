import { clsx, type ClassValue } from "clsx";
import { ConvexError } from "convex/values";
import { List } from "immutable";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRecordEntries<K extends string, V>(
  record: Record<K, V>
): [K, V][] {
  return Object.entries(record) as [K, V][];
}

export function formatProbabilityAsPercentage(prob: number): string {
  const decimalPlaces =
    prob < 0.00001 || prob > 0.99999
      ? 5
      : prob < 0.0001 || prob > 0.9999
        ? 4
        : prob < 0.001 || prob > 0.999
          ? 3
          : prob < 0.01 || prob > 0.99
            ? 2
            : prob < 0.1 || prob > 0.9
              ? 1
              : 0;
  return `${(prob * 100).toFixed(decimalPlaces)}%`;
}

export function formatPlusMinusInt(n: number): string {
  return n > 0 ? `+${n.toFixed(0)}` : n.toFixed(0);
}

export function errString(error: unknown): string {
  if (error instanceof ConvexError) {
    return String(error.data);
  }
  return error instanceof Error ? error.message : String(error);
}

export function ifEnter(f: () => unknown): (e: { key: string }) => void {
  return (e) => {
    if (e.key === "Enter") {
      return f();
    }
  };
}

export const ANON_DISPLAY_NAMES = List([
  "Anonymous",
  "Nobody",
  "Incognito",
  "Masked Man",
  "Empty",
  "Anonymo",
  "Anon",
  "???",
]);
