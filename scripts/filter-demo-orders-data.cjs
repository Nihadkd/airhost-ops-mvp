const COUNTY_DEMO_ORDERS = [
  {
    key: "ostfold-cleaning",
    county: "ostfold",
    countyLabel: "Østfold",
    city: "Fredrikstad",
    type: "CLEANING",
    categoryLabelNo: "Rengjøring",
    address: "Filterdemo: Trosvikstranda 14, Fredrikstad",
    note: "Utvask etter helgebesok",
    details: "Vask bad og kjokken, bytt sengetoy og klargjor boligen for neste gjest.",
  },
  {
    key: "akershus-moving",
    county: "akershus",
    countyLabel: "Akershus",
    city: "Lillestrom",
    type: "MOVING_CARRYING",
    categoryLabelNo: "Flytting og bæring",
    address: "Filterdemo: Kanalveien 7, Lillestrom",
    note: "Baere sofa og flyttekasser opp til tredje etasje",
    details: "To personer trengs til baering av sofa, spisebord og seks flyttekasser.",
  },
  {
    key: "oslo-garden",
    county: "oslo",
    countyLabel: "Oslo",
    city: "Oslo",
    type: "GARDEN_WORK",
    categoryLabelNo: "Hagearbeid",
    address: "Filterdemo: Kirkeveien 22, Oslo",
    note: "Klippe hekk og rydde uteplass",
    details: "Klippe hekk mot gaten, rake opp avfall og gjore uteplassen klar for varen.",
  },
  {
    key: "innlandet-delivery",
    county: "innlandet",
    countyLabel: "Innlandet",
    city: "Hamar",
    type: "DELIVERY_TRANSPORT",
    categoryLabelNo: "Levering og transport",
    address: "Filterdemo: Strandgata 31, Hamar",
    note: "Hente spisebord fra lager og levere til leilighet",
    details: "Bordet ma hentes pa lager og leveres forsiktig til tredje etasje uten heis.",
  },
  {
    key: "buskerud-repairs",
    county: "buskerud",
    countyLabel: "Buskerud",
    city: "Drammen",
    type: "SMALL_REPAIRS",
    categoryLabelNo: "Små reparasjoner",
    address: "Filterdemo: Bragernes torg 5, Drammen",
    note: "Montere hylle og stramme dorklinke",
    details: "Ta med enkelt verktoy for veggmontering og stramming av los dorklinke.",
  },
  {
    key: "vestfold-pets",
    county: "vestfold",
    countyLabel: "Vestfold",
    city: "Tonsberg",
    type: "PET_CARE",
    categoryLabelNo: "Dyrepass",
    address: "Filterdemo: Nedre Langgate 18, Tonsberg",
    note: "Hundepass i fire timer pa ettermiddagen",
    details: "Rolig hund trenger luftetur, mating og litt selskap mens eier er bortreist.",
  },
  {
    key: "telemark-tech",
    county: "telemark",
    countyLabel: "Telemark",
    city: "Skien",
    type: "TECHNICAL_HELP",
    categoryLabelNo: "Teknisk hjelp",
    address: "Filterdemo: Henrik Ibsens gate 10, Skien",
    note: "Sette opp wifi og koble til printer",
    details: "Trenger hjelp til tradlost nett, skriveroppsett og enkel forklaring til bruker.",
  },
  {
    key: "agder-airbnb",
    county: "agder",
    countyLabel: "Agder",
    city: "Kristiansand",
    type: "KEY_HANDLING",
    categoryLabelNo: "Airbnb tjenester",
    address: "Filterdemo: Markens gate 42, Kristiansand",
    note: "Check-in, nokkeloverlevering og lett klargjoring",
    guestCount: 3,
  },
  {
    key: "rogaland-other",
    county: "rogaland",
    countyLabel: "Rogaland",
    city: "Stavanger",
    type: "OTHER",
    categoryLabelNo: "Annet",
    address: "Filterdemo: Olav Vs gate 9, Stavanger",
    note: "Hjelp til enkel eventforberedelse",
    details: "Dekke bord, flytte stoler og holde orden pa utstyr for et lite arrangement.",
  },
  {
    key: "vestland-cleaning",
    county: "vestland",
    countyLabel: "Vestland",
    city: "Bergen",
    type: "CLEANING",
    categoryLabelNo: "Rengjøring",
    address: "Filterdemo: Strandgaten 55, Bergen",
    note: "Rengjoring mellom to gjestebokinger",
    details: "Vask gulv, bad og kjokken, fyll pa handsaape og legg frem nye handklar.",
  },
  {
    key: "more-delivery",
    county: "more-og-romsdal",
    countyLabel: "Møre og Romsdal",
    city: "Alesund",
    type: "DELIVERY_TRANSPORT",
    categoryLabelNo: "Levering og transport",
    address: "Filterdemo: Keiser Wilhelms gate 21, Alesund",
    note: "Kjore esker og en kommode til bod",
    details: "Transport av lett inventar til bod i naerheten, krever liten varebil.",
  },
  {
    key: "trondelag-garden",
    county: "trondelag",
    countyLabel: "Trøndelag",
    city: "Trondheim",
    type: "GARDEN_WORK",
    categoryLabelNo: "Hagearbeid",
    address: "Filterdemo: Munkegata 14, Trondheim",
    note: "Rydde hagebed og klippe plen",
    details: "Fjerne ugress, klippe liten plen og samle hageavfall i sekker.",
  },
  {
    key: "nordland-repairs",
    county: "nordland",
    countyLabel: "Nordland",
    city: "Bodo",
    type: "SMALL_REPAIRS",
    categoryLabelNo: "Små reparasjoner",
    address: "Filterdemo: Storgata 3, Bodo",
    note: "Bytte list ved ytterdor",
    details: "Liten snekkerjobb med tilpasning og feste av ny list ved inngangsdor.",
  },
  {
    key: "troms-pets",
    county: "troms",
    countyLabel: "Troms",
    city: "Tromso",
    type: "PET_CARE",
    categoryLabelNo: "Dyrepass",
    address: "Filterdemo: Storgata 92, Tromso",
    note: "Kattepass med mating og rydding av kattesand",
    details: "Besok morgen og kveld i to dager for mating, vann og enkel rengjoring.",
  },
  {
    key: "finnmark-tech",
    county: "finnmark",
    countyLabel: "Finnmark",
    city: "Alta",
    type: "TECHNICAL_HELP",
    categoryLabelNo: "Teknisk hjelp",
    address: "Filterdemo: Markedsgata 6, Alta",
    note: "Hjelp til TV-oppsett og streaming",
    details: "Koble til smart-TV, streamingboks og rydde i kabler bak mediebenken.",
  },
];

function buildDemoOrderPayloads() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(8, 0, 0, 0);

  return COUNTY_DEMO_ORDERS.map((order, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + Math.floor(index / 4));
    date.setUTCHours(8 + (index % 4) * 2, index % 2 === 0 ? 0 : 30, 0, 0);

    const deadlineAt = new Date(date);
    deadlineAt.setUTCHours(deadlineAt.getUTCHours() + 2);

    return {
      ...order,
      date: date.toISOString(),
      deadlineAt: order.type === "KEY_HANDLING" ? undefined : deadlineAt.toISOString(),
    };
  });
}

module.exports = {
  COUNTY_DEMO_ORDERS,
  buildDemoOrderPayloads,
};
