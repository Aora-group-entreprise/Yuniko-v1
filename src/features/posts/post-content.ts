const HASHTAG_PATTERN = /(^|\s)(#[\p{L}\p{N}_-]+)/gu;
const MENTION_PATTERN = /(^|\s)(@[A-Za-z0-9_.-]+)/g;

export interface ParsedPostContent {
  hashtags: string[];
  mentions: string[];
}

/** Pure Phase 2 parser. No network or database access. */
export function parsePostContent(caption: string): ParsedPostContent {
  const hashtags = Array.from(caption.matchAll(HASHTAG_PATTERN), (match) => match[2].toLowerCase());
  const mentions = Array.from(caption.matchAll(MENTION_PATTERN), (match) => match[2].slice(1).toLowerCase());

  return {
    hashtags: Array.from(new Set(hashtags)),
    mentions: Array.from(new Set(mentions)),
  };
}

/** The derived hashtag representation used by Feed/Post read models. */
export function normalizeHashtags(caption: string): string[] {
  return parsePostContent(caption).hashtags;
}
