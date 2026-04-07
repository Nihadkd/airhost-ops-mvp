import { ServiceType } from "@prisma/client";

export const ORDERABLE_SERVICE_TYPES: ServiceType[] = [
  ServiceType.CLEANING,
  ServiceType.MOVING_CARRYING,
  ServiceType.GARDEN_WORK,
  ServiceType.DELIVERY_TRANSPORT,
  ServiceType.SMALL_REPAIRS,
  ServiceType.PET_CARE,
  ServiceType.TECHNICAL_HELP,
  ServiceType.KEY_HANDLING,
  ServiceType.OTHER,
];

const SERVICE_TYPE_SEARCH_ALIASES: Record<ServiceType, string[]> = {
  [ServiceType.CLEANING]: [
    "cleaning",
    "rengjoring",
    "renhold",
    "vaskehjelp",
    "utvask",
    "housekeeping",
  ],
  [ServiceType.MOVING_CARRYING]: [
    "moving",
    "moving carrying",
    "flytting",
    "flytting og baering",
    "baering",
    "flyttehjelp",
    "flyttejobb",
  ],
  [ServiceType.GARDEN_WORK]: [
    "garden",
    "garden work",
    "hagearbeid",
    "hage",
    "plenklipp",
    "gressklipp",
  ],
  [ServiceType.DELIVERY_TRANSPORT]: [
    "delivery",
    "transport",
    "delivery transport",
    "levering",
    "frakt",
    "henting",
  ],
  [ServiceType.SMALL_REPAIRS]: [
    "small repairs",
    "repairs",
    "handyman",
    "sma reparasjoner",
    "smajobber",
    "reparasjon",
    "fiksejobb",
  ],
  [ServiceType.PET_CARE]: [
    "pet care",
    "petcare",
    "dyrepass",
    "hundepass",
    "kattepass",
  ],
  [ServiceType.TECHNICAL_HELP]: [
    "technical help",
    "tech help",
    "teknisk hjelp",
    "teknisk",
    "datahjelp",
    "pc hjelp",
  ],
  [ServiceType.KEY_HANDLING]: [
    "key handling",
    "airbnb",
    "airbnb tjenester",
    "nokkelhandtering",
    "nokkellevering",
    "check in",
    "check out",
  ],
  [ServiceType.OTHER]: ["other", "annet", "diverse"],
};

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "av",
  "for",
  "i",
  "med",
  "og",
  "pa",
  "the",
  "til",
]);

export function normalizeSearchText(value: string) {
  return value
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .replace(/[åÅ]/g, "a")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function splitSearchTerms(value: string) {
  return value
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term) => {
      const normalizedTerm = normalizeSearchText(term);
      if (/^\d+$/.test(normalizedTerm)) {
        return true;
      }

      return normalizedTerm.length >= 2 && !SEARCH_STOP_WORDS.has(normalizedTerm);
    });
}

export function getServiceTypeSearchAliases(type: string) {
  if (!isValidServiceType(type)) return [];
  return SERVICE_TYPE_SEARCH_ALIASES[type];
}

export function matchesServiceTypeSearchQuery(type: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;

  const aliases = getServiceTypeSearchAliases(type);
  if (aliases.length === 0) return false;

  const allowPartialAliasMatch = normalizedQuery.length >= 3;

  return aliases.some((alias) => {
    if (alias === normalizedQuery || normalizedQuery.includes(alias)) {
      return true;
    }

    return allowPartialAliasMatch && alias.includes(normalizedQuery);
  });
}

export function findMatchingServiceTypes(query: string) {
  return ORDERABLE_SERVICE_TYPES.filter((type) => matchesServiceTypeSearchQuery(type, query));
}

export function getServiceTypeTranslationKey(type: string) {
  switch (type) {
    case ServiceType.CLEANING:
      return "serviceCleaningName";
    case ServiceType.MOVING_CARRYING:
      return "serviceMovingCarryingName";
    case ServiceType.GARDEN_WORK:
      return "serviceGardenWorkName";
    case ServiceType.DELIVERY_TRANSPORT:
      return "serviceDeliveryTransportName";
    case ServiceType.SMALL_REPAIRS:
      return "serviceSmallRepairsName";
    case ServiceType.PET_CARE:
      return "servicePetCareName";
    case ServiceType.TECHNICAL_HELP:
      return "serviceTechnicalHelpName";
    case ServiceType.KEY_HANDLING:
      return "serviceAirbnbServicesName";
    case ServiceType.OTHER:
      return "serviceOtherName";
    default:
      return null;
  }
}

export function isGuestCountServiceType(type: string) {
  return type === ServiceType.KEY_HANDLING;
}

export function isChecklistServiceType(type: string) {
  return type === ServiceType.CLEANING;
}

export function isValidServiceType(type: string): type is ServiceType {
  return ORDERABLE_SERVICE_TYPES.includes(type as ServiceType);
}
