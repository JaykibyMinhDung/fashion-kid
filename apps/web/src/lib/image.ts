export function isExternalImageUrl(source: string): boolean {
  const value = source.trim();

  if (!value) return false;
  if (value.startsWith("//")) return true;
  if (value.startsWith("/")) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
