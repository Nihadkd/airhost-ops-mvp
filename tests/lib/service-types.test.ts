import { describe, expect, it } from "vitest";
import {
  findMatchingServiceTypes,
  matchesServiceTypeSearchQuery,
  normalizeSearchText,
  splitSearchTerms,
} from "@/lib/service-types";

describe("service type search helpers", () => {
  it("normalizes diacritics and punctuation", () => {
    expect(normalizeSearchText("  Rengjøring, Oslo!  ")).toBe("rengjoring oslo");
  });

  it("matches norwegian and partial aliases", () => {
    expect(findMatchingServiceTypes("flyttehjelp")).toContain("MOVING_CARRYING");
    expect(findMatchingServiceTypes("rengj")).toContain("CLEANING");
    expect(matchesServiceTypeSearchQuery("KEY_HANDLING", "airbnb tjenester")).toBe(true);
  });

  it("drops filler words from search terms", () => {
    expect(splitSearchTerms("flytting og baering i oslo 2")).toEqual(["flytting", "baering", "oslo", "2"]);
  });
});
