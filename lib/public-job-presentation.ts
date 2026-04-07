export const NORWEGIAN_COUNTIES = [
  "Alle fylker",
  "\u00d8stfold",
  "Akershus",
  "Oslo",
  "Innlandet",
  "Buskerud",
  "Vestfold",
  "Telemark",
  "Agder",
  "Rogaland",
  "Vestland",
  "M\u00f8re og Romsdal",
  "Tr\u00f8ndelag",
  "Nordland",
  "Troms",
  "Finnmark",
] as const;

export const UNKNOWN_COUNTY = "Ukjent område";

const COUNTY_MATCHERS: Array<{ county: (typeof NORWEGIAN_COUNTIES)[number]; terms: string[] }> = [
  { county: NORWEGIAN_COUNTIES[1], terms: ["ostfold", "fredrikstad", "sarpsborg", "moss", "halden"] },
  { county: NORWEGIAN_COUNTIES[2], terms: ["akershus", "baerum", "sandvika", "asker", "lillestrom", "strommen", "ski", "drobak"] },
  { county: NORWEGIAN_COUNTIES[3], terms: ["oslo", "majorstuen", "frogner", "skoyen", "grunerlokka", "st hanshaugen"] },
  { county: NORWEGIAN_COUNTIES[4], terms: ["innlandet", "hamar", "gjovik", "lillehammer", "elverum"] },
  { county: NORWEGIAN_COUNTIES[5], terms: ["buskerud", "drammen", "kongsberg", "honefoss"] },
  { county: NORWEGIAN_COUNTIES[6], terms: ["vestfold", "tonsberg", "sandefjord", "larvik", "horten"] },
  { county: NORWEGIAN_COUNTIES[7], terms: ["telemark", "skien", "porsgrunn", "notodden"] },
  { county: NORWEGIAN_COUNTIES[8], terms: ["agder", "kristiansand", "arendal", "grimstad"] },
  { county: NORWEGIAN_COUNTIES[9], terms: ["rogaland", "stavanger", "sandnes", "haugesund", "sola"] },
  { county: NORWEGIAN_COUNTIES[10], terms: ["vestland", "bergen", "askoy", "sogndal", "floro"] },
  { county: NORWEGIAN_COUNTIES[11], terms: ["more og romsdal", "alesund", "molde", "kristiansund"] },
  { county: NORWEGIAN_COUNTIES[12], terms: ["trondelag", "trondheim", "stjordal", "levanger"] },
  { county: NORWEGIAN_COUNTIES[13], terms: ["nordland", "bodo", "narvik", "mo i rana"] },
  { county: NORWEGIAN_COUNTIES[14], terms: ["troms", "tromso", "harstad", "finnsnes"] },
  { county: NORWEGIAN_COUNTIES[15], terms: ["finnmark", "alta", "hammerfest", "kirkenes"] },
];

function normalizeLocationText(value: string) {
  return value
    .replace(/[\u00e6\u00c6]/g, "ae")
    .replace(/[\u00f8\u00d8]/g, "o")
    .replace(/[\u00e5\u00c5]/g, "a")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsNormalizedTerm(normalizedValue: string, term: string) {
  const normalizedTerm = normalizeLocationText(term);
  if (!normalizedTerm) return false;

  return ` ${normalizedValue} `.includes(` ${normalizedTerm} `);
}

export function inferCounty(address: string) {
  const normalized = normalizeLocationText(address);
  const directCountyMatch = COUNTY_MATCHERS.find(({ county }) => containsNormalizedTerm(normalized, county));

  if (directCountyMatch) {
    return directCountyMatch.county;
  }

  const aliasMatch = COUNTY_MATCHERS.find(({ terms }) => terms.some((term) => containsNormalizedTerm(normalized, term)));
  if (aliasMatch) {
    return aliasMatch.county;
  }

  return UNKNOWN_COUNTY;
}

export function inferCity(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.at(-1) ?? address;
  }

  return inferCounty(address);
}
