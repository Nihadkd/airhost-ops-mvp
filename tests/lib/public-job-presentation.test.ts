import { describe, expect, it } from "vitest";
import { inferCity, inferCounty, NORWEGIAN_COUNTIES, UNKNOWN_COUNTY } from "@/lib/public-job-presentation";

describe("public job presentation helpers", () => {
  it("maps common cities to the correct county", () => {
    expect(inferCounty("Strandgaten 55, Bergen")).toBe(NORWEGIAN_COUNTIES[10]);
    expect(inferCounty("Markedsgata 6, Alta")).toBe(NORWEGIAN_COUNTIES[15]);
    expect(inferCounty("Storgata 92, Tromso")).toBe(NORWEGIAN_COUNTIES[14]);
  });

  it("keeps oslo and akershus addresses distinct", () => {
    expect(inferCounty("Kirkeveien 22, Oslo")).toBe(NORWEGIAN_COUNTIES[3]);
    expect(inferCounty("Kanalveien 7, Lillestrom")).toBe(NORWEGIAN_COUNTIES[2]);
    expect(inferCounty("Henrik Ibsens gate 10, Skien")).toBe(NORWEGIAN_COUNTIES[7]);
  });

  it("returns the trailing city when present", () => {
    expect(inferCity("Trosvikstranda 14, Fredrikstad")).toBe("Fredrikstad");
  });

  it("does not default unknown addresses to Oslo", () => {
    expect(inferCounty("Harbor Road 4, Exampletown")).toBe(UNKNOWN_COUNTY);
  });
});
