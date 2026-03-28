export const NORWEGIAN_COUNTIES = [
  "Alle fylker",
  "Østfold",
  "Akershus",
  "Oslo",
  "Innlandet",
  "Buskerud",
  "Vestfold",
  "Telemark",
  "Agder",
  "Rogaland",
  "Vestland",
  "Møre og Romsdal",
  "Trøndelag",
  "Nordland",
  "Troms",
  "Finnmark",
] as const;

export function inferCounty(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized.includes("oslo") ||
    normalized.includes("grünerløkka") ||
    normalized.includes("grunerløkka") ||
    normalized.includes("skøyen") ||
    normalized.includes("skoyen")
  ) {
    return "Oslo";
  }

  if (
    normalized.includes("bærum") ||
    normalized.includes("baerum") ||
    normalized.includes("bekkestua") ||
    normalized.includes("jar")
  ) {
    return "Akershus";
  }

  return "Oslo";
}

export function inferCity(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.at(-1) ?? address;
  }

  return inferCounty(address);
}
