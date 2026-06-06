import {
  extractStreetNumberFromAddress,
  streetNameAfterNumber,
} from "@/lib/property/getLockedDisplayAddress";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces AI-hallucinated street numbers (e.g. 1800 vs 18) with the locked address line.
 */
export function enforceLockedDisplayAddress(
  text: string,
  lockedDisplayAddress: string
): string {
  if (!text.trim() || !lockedDisplayAddress.trim()) return text;

  const lockedStreetLine = lockedDisplayAddress.split(",")[0]?.trim() ?? "";
  const lockedNum = extractStreetNumberFromAddress(lockedStreetLine);
  const streetName = streetNameAfterNumber(lockedDisplayAddress);

  if (!lockedStreetLine) return text;

  let result = text;

  if (streetName && lockedNum) {
    const streetPattern = escapeRegex(streetName);
    const wrongLeadingNumber = new RegExp(
      `\\b(?!${escapeRegex(lockedNum)})\\d+[a-z]?\\s+${streetPattern}\\b`,
      "gi"
    );
    result = result.replace(wrongLeadingNumber, lockedStreetLine);

    const wrongExpandedPrefix = new RegExp(
      `\\b${escapeRegex(lockedNum)}0+\\s+${streetPattern}\\b`,
      "gi"
    );
    result = result.replace(wrongExpandedPrefix, lockedStreetLine);
  }

  if (lockedNum === "18" && streetName?.includes("swimmer")) {
    result = result.replace(/\b1800\s+swimmers?\s+point\b/gi, lockedStreetLine);
  }

  const fullWrongLine = new RegExp(
    `\\b\\d+[a-z]?\\s+${streetName ? escapeRegex(streetName) : "[\\w\\s]+"}(?=\\s*,|\\s+in\\b|\\s+on\\b|\\.|$)`,
    "gi"
  );
  result = result.replace(fullWrongLine, (match) => {
    const matchNum = extractStreetNumberFromAddress(match);
    if (matchNum && lockedNum && matchNum !== lockedNum) {
      return lockedStreetLine;
    }
    return match;
  });

  return result;
}

export function enforceLockedDisplayAddressOnReport<T extends object>(
  report: T,
  lockedDisplayAddress: string
): T {
  const process = (value: string) =>
    enforceLockedDisplayAddress(value, lockedDisplayAddress);

  const next = { ...report } as Record<string, unknown>;
  for (const [key, value] of Object.entries(report)) {
    if (typeof value === "string") {
      next[key] = process(value);
    } else if (Array.isArray(value)) {
      next[key] = value.map((item) =>
        typeof item === "string" ? process(item) : item
      );
    }
  }
  return next as T;
}
