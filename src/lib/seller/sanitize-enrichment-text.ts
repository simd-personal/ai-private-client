/** Remove CJK and other unexpected scripts from generated English copy. */
const NON_LATIN_SCRIPT_PATTERN =
  /[\u3000-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/g;

const MERGED_WORD_FIXES: Array<[RegExp, string]> = [
  [/\bwitha\b/gi, "with a"],
  [/\bbeforemarket\b/gi, "before market"],
  [/\btomarket\b/gi, "to market"],
  [/\bandamenities\b/gi, "and amenities"],
  [/\bwithintheweek\b/gi, "within the week"],
  [/\bbecomfortable\b/gi, "be comfortable"],
  [/\bforprivacy\b/gi, "for privacy"],
  [/\baccess protocol,and\b/gi, "access protocol, and"],
  [/\bwhile pressure test\b/gi, "while we pressure test"],
  [/\bwhile pressure-testing\b/gi, "while we pressure-test"],
  [/\bpressure test the model\b/gi, "pressure test the model"],
];

const PUBLIC_SOURCE_REPLACERS: Array<[RegExp, string]> = [
  [/\bRentCast\b/gi, "third-party property data"],
  [/\bGoogle Maps\b/gi, "address validation"],
  [/\bgoogle_maps_api\b/gi, "address validation"],
  [/\bgoogle maps api\b/gi, "address validation"],
  [/\bI viewed Google Maps\b/gi, "Address validation"],
  [/\bexternal normalization returned\b/gi, "address validation indicated"],
  [/\bMLS\b/g, "market records"],
  [/\bZillow\b/gi, "third-party sources"],
  [/\bRedfin\b/gi, "third-party sources"],
];

/**
 * Cleans seller-facing and concierge-generated prose after AI output.
 */
export function sanitizeEnrichmentText(text: string): string {
  let result = text.replace(NON_LATIN_SCRIPT_PATTERN, "");

  for (const [pattern, replacement] of MERGED_WORD_FIXES) {
    result = result.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of PUBLIC_SOURCE_REPLACERS) {
    result = result.replace(pattern, replacement);
  }

  result = result
    .replace(/,([A-Za-z])/g, ", $1")
    .replace(/\.([A-Z])/g, ". $1")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();

  return result;
}
