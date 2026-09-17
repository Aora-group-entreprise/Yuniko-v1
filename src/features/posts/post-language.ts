const LANGUAGE_HINTS: Record<string, RegExp> = {
  en: /\b(the|and|you|your|with|this|that|for|from|have|love|today|life)\b/i,
  fr: /\b(le|la|les|des|une|avec|pour|dans|que|vous|nous|est|être|amour|aujourd)\b/i,
};

export type PostLanguage = "en" | "fr" | "unknown";

/**
 * Lightweight client hint only. The authoritative language detection belongs
 * to the server-side publication transaction described by the build plan.
 */
export function detectPostLanguage(caption: string): PostLanguage {
  const normalized = caption.trim();
  if (!normalized) return "unknown";

  const matches = Object.entries(LANGUAGE_HINTS)
    .map(([language, pattern]) => ({ language: language as "en" | "fr", score: normalized.match(pattern)?.length ?? 0 }))
    .sort((a, b) => b.score - a.score);

  if (matches[0]?.score === 0 || matches[0]?.score === matches[1]?.score) return "unknown";
  return matches[0].language;
}
