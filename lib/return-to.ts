export function normalizeReturnTo(value: string | string[] | undefined | null, fallback = "/") {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}

export function appendReturnTo(href: string, returnTo: string) {
  const normalizedReturnTo = normalizeReturnTo(returnTo, "");
  if (!normalizedReturnTo) {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(normalizedReturnTo)}`;
}
