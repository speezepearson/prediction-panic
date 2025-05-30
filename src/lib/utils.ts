import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRecordEntries<K extends string, V>(
  record: Record<K, V>
): [K, V][] {
  return Object.entries(record) as [K, V][];
}
