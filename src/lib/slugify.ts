/** URL-safe slug from a title (Spanish-friendly diacritics stripped). */
export function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : "torneo";
}
