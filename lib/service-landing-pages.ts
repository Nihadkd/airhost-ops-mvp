type FaqItem = {
  question: string;
  answer: string;
};

export type ServiceLandingPage = {
  slug: string;
  path: string;
  title: string;
  description: string;
  heading: string;
  summary: string;
  intro: string;
  highlights: string[];
  commonJobs: string[];
  faq: FaqItem[];
  keywords: string[];
};

export const serviceLandingPages: ServiceLandingPage[] = [
  {
    slug: "rengjoring",
    path: "/tjenester/rengjoring",
    title: "Rengjoring | Finn lokal hjelp til vask og rydding",
    description:
      "Finn lokal hjelp til rengjoring, vask, rydding og Airbnb-klargjoring med ServNest. Se tjenester, legg ut jobb og kom raskt i gang.",
    heading: "Rengjoring",
    summary:
      "Trenger du hjelp til vask, rydding eller klargjoring mellom gjester? ServNest gjor det enklere a finne folk som kan ta jobben.",
    intro:
      "Denne siden er laget for deg som vil finne eller tilby rengjoringstjenester gjennom ServNest. Vi dekker alt fra enkel hjemmerengjoring til vask mellom utleierunder.",
    highlights: [
      "Beskriv oppdraget tydelig og legg ved tidspunkt, areal og eventuelle spesielle behov.",
      "Bruk siden for a finne riktig tjeneste raskere, enten du trenger vask hjemme eller mellom Airbnb-opphold.",
      "Kombiner rengjoring med andre tjenester som nokkelhandtering eller enkel klargjoring.",
    ],
    commonJobs: [
      "Fast eller engangs rengjoring",
      "Flyttevask og utvask",
      "Airbnb-klargjoring mellom gjester",
      "Rydding, stovtorking og enkel organisering",
    ],
    faq: [
      {
        question: "Hvilke typer rengjoring passer ServNest for?",
        answer: "ServNest passer for bade engangsoppdrag, faste behov og oppdrag mellom gjester i korttidsutleie.",
      },
      {
        question: "Kan jeg beskrive spesielle behov?",
        answer: "Ja. Jo mer konkret du beskriver rom, areal og forventet resultat, desto bedre matcher oppdraget soketrafikken og brukerne.",
      },
      {
        question: "Er rengjoring relevant for lokal SEO?",
        answer: "Ja. Rengjoring er en typisk lokal tjeneste, sa egne landingssider og stedssider er ofte sterke signaler for Google.",
      },
    ],
    keywords: ["rengjoring", "vask", "flyttevask", "airbnb vask", "vaskehjelp"],
  },
  {
    slug: "flyttehjelp",
    path: "/tjenester/flyttehjelp",
    title: "Flyttehjelp | Finn hjelp til baring, transport og flytting",
    description:
      "Finn lokal flyttehjelp gjennom ServNest. Lag oppdrag for baring, transport, pakking og enkel flyttelogistikk.",
    heading: "Flyttehjelp",
    summary:
      "ServNest hjelper deg a finne folk som kan bidra med baring, transport og praktiske oppgaver rundt flytting.",
    intro:
      "Flytting er en av de tjenestene mange sok etter med sted og behov i samme sok. Derfor er en tydelig landingsside viktig for synlighet.",
    highlights: [
      "Beskriv etasjer, tunge loft og behov for bil eller barehjelp.",
      "Bruk tjenestesiden til a forklare hva slags flytteoppdrag du tilbyr eller trenger.",
      "Kombiner flyttehjelp med levering, transport og sma reparasjoner etter behov.",
    ],
    commonJobs: [
      "Baring av mobler og esker",
      "Lokal transport og korte flytteoppdrag",
      "Pakkehjelp og utpakking",
      "Hjelp med montering etter innflytting",
    ],
    faq: [
      {
        question: "Hva bor en flyttehjelp-side inneholde?",
        answer: "Den bor forklare hva som flyttes, hvor mye som skal bares, om du trenger bil, og hvilke omrader tjenesten dekker.",
      },
      {
        question: "Kan flyttehjelp kombineres med transport?",
        answer: "Ja. Mange oppdrag trenger bade baring og lokal transport, og det bor beskrives tydelig pa siden.",
      },
      {
        question: "Hvorfor er egne tjenestesider viktige?",
        answer: "Google forstar lettere hva siden handler om nar hver tjeneste har egen URL, eget innhold og egne interne lenker.",
      },
    ],
    keywords: ["flyttehjelp", "baring", "transport", "flytting", "hjelp til flytting"],
  },
  {
    slug: "hagearbeid",
    path: "/tjenester/hagearbeid",
    title: "Hagearbeid | Finn hjelp til klipping, rydding og uteomrade",
    description:
      "ServNest hjelper deg a finne lokal hjelp til hagearbeid, rydding, klipping og annet arbeid ute.",
    heading: "Hagearbeid",
    summary:
      "Trenger du hjelp i hagen eller rundt eiendommen? ServNest gjor det enklere a koble sammen oppdragsgivere og hjelpere.",
    intro:
      "Hagearbeid har ofte tydelig lokal intensjon. Derfor er det smart a bygge innhold som svarer pa hva jobben gjelder og hvor den skal utfores.",
    highlights: [
      "Forklar sesong, storrelse pa tomten og hvilke redskaper som trengs.",
      "Lag tydelige beskrivelser for gressklipping, rydding, beskjaring eller bortkjoring.",
      "Bruk tjenestesiden som inngang for bade organiske sok og interne lenker fra forsiden.",
    ],
    commonJobs: [
      "Gressklipping og kantklipp",
      "Rydding av hage og uteomrader",
      "Enkel beskjaring og luking",
      "Bortkjoring av hageavfall",
    ],
    faq: [
      {
        question: "Hvilke oppdrag passer under hagearbeid?",
        answer: "Alt fra enkel vedlikeholdsklipp til rydding, luking og sesongbaserte uteoppgaver.",
      },
      {
        question: "Borde jeg nevne sesong i teksten?",
        answer: "Ja. Sesongord som var, sommer og host kan hjelpe siden med a matche relevante sok.",
      },
      {
        question: "Er sted viktig for denne typen tjeneste?",
        answer: "Ja. Hagearbeid er nesten alltid lokalt, sa stedssider og tydelig omradedekning er viktige neste steg.",
      },
    ],
    keywords: ["hagearbeid", "gressklipping", "hagehjelp", "rydding ute", "utearbeid"],
  },
  {
    slug: "levering-og-transport",
    path: "/tjenester/levering-og-transport",
    title: "Levering og transport | Finn lokal hjelp til frakt og levering",
    description:
      "ServNest gjor det enklere a finne lokal hjelp til levering, transport og korte fraktoppdrag.",
    heading: "Levering og transport",
    summary:
      "Fra korte henteoppdrag til lokal transport: denne siden samler informasjon som gjor det enklere a rangere pa transportrelaterte sok.",
    intro:
      "Nar folk soker etter levering eller hjelp til a frakte noe, trenger de en side som tydelig forklarer hva som faktisk tilbys.",
    highlights: [
      "Beskriv volum, hentested, leveringssted og tidsvindu.",
      "Skill tydelig mellom flyttehjelp og levering eller frakt.",
      "Bruk en egen side for levering og transport slik at sokemotorer lettere kan matche riktig intensjon.",
    ],
    commonJobs: [
      "Henting av varer i naeromradet",
      "Kortreist transport av ting og utstyr",
      "Levering mellom private adresser",
      "Enkle fraktoppdrag i byen eller regionen",
    ],
    faq: [
      {
        question: "Hva er forskjellen pa flyttehjelp og levering?",
        answer: "Flyttehjelp handler ofte om baring og flytting av et helt lass, mens levering og transport typisk er mer avgrensede hente- og bringeoppdrag.",
      },
      {
        question: "Hva bor beskrives i oppdraget?",
        answer: "Mottaker, hentested, leveringssted, storrelse og om noe er skjort eller tungt.",
      },
      {
        question: "Kan denne siden rangere pa lokale sok?",
        answer: "Ja, spesielt nar tjenesten kombineres med by- og omradenavn i egne sider og godt innhold.",
      },
    ],
    keywords: ["levering", "transport", "frakt", "hentehjelp", "lokal levering"],
  },
  {
    slug: "sma-reparasjoner",
    path: "/tjenester/sma-reparasjoner",
    title: "Sma reparasjoner | Finn lokal hjelp til smajobber hjemme",
    description:
      "Finn lokal hjelp til sma reparasjoner, montering, enkel vedlikehold og praktiske smajobber hjemme med ServNest.",
    heading: "Sma reparasjoner",
    summary:
      "Trenger du hjelp til praktiske smajobber hjemme? ServNest gjor det enklere a finne lokal hjelp til reparasjoner og enkel montering.",
    intro:
      "Sma reparasjoner er en sterk sokekategori fordi mange leter etter raske, konkrete losninger i sitt narmiljo. Derfor er det viktig med en side som forklarer nøyaktig hva tjenesten dekker.",
    highlights: [
      "Forklar tydelig hvilke typer smajobber som passer pa siden, sa Google og brukerne forstar innholdet med en gang.",
      "Bruk tjenestesiden som inngangspunkt for montering, enkel vedlikehold og praktisk hjelp hjemme.",
      "Kombiner denne siden med lokale stedssider senere for a styrke synlighet pa sok i bestemte byer.",
    ],
    commonJobs: [
      "Montering av hyller, gardinstenger og sma mobler",
      "Bytte av handtak, lister og enklere deler",
      "Oppheng av lamper og veggmontert utstyr der arbeidet er lovlig og forsvarlig",
      "Praktiske smajobber og enkel vedlikehold hjemme",
    ],
    faq: [
      {
        question: "Hva menes med sma reparasjoner?",
        answer: "Det er typisk mindre praktiske jobber hjemme, som montering, justering, enkle bytter og vedlikehold som ikke krever stor entreprise.",
      },
      {
        question: "Hvorfor er denne siden viktig for SEO?",
        answer: "Mange soker direkte etter sma reparasjoner, handymantjenester og smajobber. En dedikert side gir Google et tydelig emne a rangere.",
      },
      {
        question: "Hva er neste SEO-steg etter en tjenesteside?",
        answer: "Neste steg er ofte lokale undersider, flere FAQ-er, ekte kundeeksempler og interne lenker fra andre relevante sider.",
      },
    ],
    keywords: ["sma reparasjoner", "smajobber", "handyman", "montering", "praktisk hjelp hjemme"],
  },
  {
    slug: "dyrepass",
    path: "/tjenester/dyrepass",
    title: "Dyrepass | Finn lokal hjelp til pass og tilsyn av kjaledyr",
    description:
      "ServNest hjelper deg a finne lokal hjelp til dyrepass, hundelufting og tilsyn av kjaledyr nar du trenger det.",
    heading: "Dyrepass",
    summary:
      "Fra korte tilsyn til praktisk dyrepass: denne siden samler innhold som matcher det folk faktisk soker etter nar de trenger hjelp med kjaledyr.",
    intro:
      "Dyrepass har ofte hoy tillitsfaktor. Derfor er tydelig informasjon, kontaktpunkter og gode beskrivelser ekstra viktige for synlighet og konvertering.",
    highlights: [
      "Beskriv dyretype, antall dyr, varighet og eventuelle behov i oppdraget.",
      "Bruk siden for a forklare om tjenesten gjelder pass hjemme, lufting eller kort tilsyn.",
      "Kombiner gode beskrivelser med tydelige kontaktpunkter og FAQ for a bygge troverdighet.",
    ],
    commonJobs: [
      "Kort tilsyn av hund eller katt",
      "Hundelufting og mating",
      "Dyrepass hjemme hos eier",
      "Tilsyn ved reise eller hektiske dager",
    ],
    faq: [
      {
        question: "Hvilke typer dyrepass er mest relevante?",
        answer: "Tilsyn, lufting, mating og enkel omsorg for kjaledyr er de mest vanlige behovene.",
      },
      {
        question: "Hvorfor bor jeg beskrive dyret godt?",
        answer: "Tydelige beskrivelser gir bedre matching og sterkere relevans bade for brukere og sokemotorer.",
      },
      {
        question: "Er dyrepass en lokal soketjeneste?",
        answer: "Ja. Mange soker etter dyrepass i sitt eget omrade, sa lokale landingssider er spesielt relevante her.",
      },
    ],
    keywords: ["dyrepass", "hundelufting", "kattepass", "pass av kjaledyr", "tilsyn dyr"],
  },
  {
    slug: "teknisk-hjelp",
    path: "/tjenester/teknisk-hjelp",
    title: "Teknisk hjelp | Finn lokal hjelp til enkle tekniske oppgaver",
    description:
      "Finn lokal hjelp til enkle tekniske oppgaver, oppsett og praktisk teknisk hjelp med ServNest.",
    heading: "Teknisk hjelp",
    summary:
      "ServNest gjor det lettere a finne teknisk hjelp til oppsett, feilsoking og praktiske oppgaver som ikke krever stor konsulentleveranse.",
    intro:
      "Mange soker etter teknisk hjelp pa et konkret problem. Derfor bor denne siden forklare tydelig hva slags hjelp som tilbys og hvordan man kommer i gang.",
    highlights: [
      "Bruk klart sprak rundt oppsett, feilsoking og enkel praktisk hjelp.",
      "Beskriv hva som er inkludert, og hva som eventuelt ikke dekkes.",
      "Kombiner teknisk hjelp med egne FAQ-er for vanlige problemer og behov.",
    ],
    commonJobs: [
      "Oppsett av enkle digitale tjenester eller utstyr",
      "Praktisk hjelp med apper, kontoer og grunnleggende feilsoking",
      "Teknisk hjelp hjemme eller hos utleier",
      "Hjelp til a komme i gang med nytt utstyr eller en ny tjeneste",
    ],
    faq: [
      {
        question: "Hva slags teknisk hjelp passer pa ServNest?",
        answer: "Enkle og praktiske oppgaver som oppsett, grunnleggende feilsoking og hjelp til a bruke digitale tjenester eller utstyr.",
      },
      {
        question: "Bor jeg bruke fagord i teksten?",
        answer: "Bare der det hjelper brukeren. Klart, konkret sprak fungerer ofte bedre enn unodig teknisk sjargong i SEO-innhold.",
      },
      {
        question: "Kan denne siden kombineres med sma reparasjoner?",
        answer: "Ja. Noen oppdrag overlapper, men egne sider for hver tjeneste gir sterkere og tydeligere sokesignaler.",
      },
    ],
    keywords: ["teknisk hjelp", "feilsoking", "oppsett", "digital hjelp", "hjelp med teknologi"],
  },
  {
    slug: "airbnb-tjenester",
    path: "/tjenester/airbnb-tjenester",
    title: "Airbnb tjenester | Hjelp til nokkelhandtering, vask og gjesteflyt",
    description:
      "ServNest hjelper utleiere med Airbnb-tjenester som nokkelhandtering, klargjoring, vask og praktisk gjesteflyt.",
    heading: "Airbnb tjenester",
    summary:
      "Denne siden samler tjenester for korttidsutleie, inkludert nokkelhandtering, klargjoring, kommunikasjon og oppgaver mellom gjester.",
    intro:
      "Airbnb og korttidsutleie har tydelige sokebehov. Egne landingssider hjelper Google med a forsta at ServNest er relevant for utleiere og praktisk drift.",
    highlights: [
      "Forklar hele flyten mellom gjester, ikke bare en enkelt oppgave.",
      "Knytt tjenesten til rengjoring, nokkelhandtering og praktisk tilsyn.",
      "Bruk denne siden sammen med den dynamiske jobboversikten pa /airbnb for bade SEO og konvertering.",
    ],
    commonJobs: [
      "Nokkelhandtering og overlevering",
      "Vask og klargjoring mellom gjester",
      "Kontroll av bolig for og etter opphold",
      "Praktiske Airbnb-oppgaver i driftsflyten",
    ],
    faq: [
      {
        question: "Hvem passer Airbnb-tjenester for?",
        answer: "Siden passer for utleiere som trenger praktisk hjelp mellom gjester eller hjelp til lopende drift av korttidsutleie.",
      },
      {
        question: "Hvorfor ha en egen Airbnb-side?",
        answer: "Airbnb-tjenester har egen sokemening og egne behov. En egen side gjor det lettere a rangere pa disse sokene.",
      },
      {
        question: "Kan jeg se ledige Airbnb-oppdrag?",
        answer: "Ja. ServNest har ogsa en egen jobboversikt pa /airbnb for denne tjenestetypen.",
      },
    ],
    keywords: ["airbnb tjenester", "nokkelhandtering", "airbnb vask", "korttidsutleie", "gjesteflyt"],
  },
];

export function getServiceLandingPageBySlug(slug: string) {
  return serviceLandingPages.find((page) => page.slug === slug);
}
