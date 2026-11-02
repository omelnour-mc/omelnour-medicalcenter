/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Removes emoji status markers and extra whitespace from doctor names.
 * Markers handled: ❌ ✔️ ⚠️ ❗ and others.
 */
export function stripStatusEmojis(name: string): string {
  if (!name) return "";
  
  // Comprehensive regex to remove status icons and markers
  return name
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/[❌✔️⚠️❗✅🚫🔴🟢🟡🔵🔳🔲✔✖➕➖]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts pure doctor name without status emojis, hyphens, or status words (معتذر، استثناء، بديل، إلخ).
 */
export function extractCleanDoctorName(input: string): string {
  if (!input) return "";
  let name = stripStatusEmojis(input);
  // Remove hyphens followed by status words if present
  name = name.split(/\s*[-•]\s*/)[0];
  // Remove trailing status words if any
  name = name.replace(/\s+(معتذر|اعتذر|استثناء|بديل|مواعيد عادية|حجز مسبق)\s*$/gi, "");
  return name.trim();
}

/**
 * Normalizes input string for robust Arabic text matching and search.
 * Handles emojis, doctor prefixes, Arabic diacritics, and letter variations.
 */
export function normalizeArabicQuery(input: string): string {
  if (!input) return "";

  // 1. Strip emojis and status markers
  let text = stripStatusEmojis(input);

  // 2. Remove common doctor prefixes (د/, د., دكتور, دكتورة, Dr, Prof)
  text = text.replace(/^(د\/|د\.|دكتور\s*|دكتورة\s*|dr\.|dr\s+|prof\.|prof\s+)/gi, "");

  // 3. Remove Arabic diacritics (Tashkeel) and Tatweel
  text = text.replace(/[\u064B-\u065F\u0670]/g, "");
  text = text.replace(/\u0640/g, ""); // Tatweel ـ

  // 4. Normalize Arabic letters
  // Alef forms: أ, إ, آ, ٱ -> ا
  text = text.replace(/[أإآٱ]/g, "ا");
  // Taa Marbuta: ة -> ه
  text = text.replace(/ة/g, "ه");
  // Yaa: ى -> ي
  text = text.replace(/ى/g, "ي");

  // 5. Replace punctuation with spaces
  text = text.replace(/[./\\_,\-–—:؛،!?]/g, " ");

  // 6. Lowercase and collapse multiple spaces
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
