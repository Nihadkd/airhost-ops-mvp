"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type AppLanguage = "no" | "en";

type I18n = {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  t: (key: string) => string;
};

const messages: Record<AppLanguage, Record<string, string>> = {
  no: {
    appName: "AirHost Ops",
    dashboard: "Dashboard",
    newOrder: "Ny bestilling",
    profile: "Profil",
    users: "Brukere",
    logout: "Logg ut",
    viewAsLandlord: "Vis som utleier",
    viewAsWorker: "Vis som tjenesteutf\u00f8rer",
    login: "Logg inn",
    loginSubtitle: "Internt system for Airbnb drift",
    invalidCredentials: "Ugyldig e-post eller passord",
    email: "E-post",
    password: "Passord",
    noAccount: "Ingen konto?",
    register: "Registrer",
    registerAccount: "Registrer konto",
    name: "Navn",
    passwordMin: "Passord (min. 8)",
    roleLandlordOnly: "Kun utleier",
    roleWorkerOnly: "Kun tjenesteutf\u00f8rer",
    roleBoth: "B\u00e5de utleier og tjenesteutf\u00f8rer",
    alreadyAccount: "Har konto?",
    cannotRegister: "Kunne ikke registrere bruker",
    registerReasonEmailExists: "E-postadressen er allerede registrert.",
    registerReasonInvalidPayload: "Ugyldig registreringsdata. Sjekk feltene og pr\u00f8v igjen.",
    registerReasonDbUnavailable:
      "Registrering er midlertidig utilgjengelig fordi databasen ikke er tilgjengelig i produksjon enda.",
    registerReasonUnknown: "Registrering feilet p\u00e5 serversiden. Pr\u00f8v igjen senere.",
    overview: "Oversikt over oppdrag og aktivitet",
    jobs: "Oppdrag",
    type: "Type",
    address: "Adresse",
    date: "Dato",
    status: "Status",
    details: "Detaljer",
    action: "Handling",
    loadingJobs: "Laster oppdrag...",
    noJobs: "Ingen oppdrag enn\u00e5.",
    open: "\u00c5pen",
    takeJob: "P\u00e5ta",
    assigned: "Tildelt",
    cannotTakeJob: "Kunne ikke p\u00e5ta oppdrag",
    takenJob: "Oppdrag p\u00e5tatt",
    activeJobs: "Aktive oppdrag",
    completedJobs: "Fullf\u00f8rte",
    landlords: "Utleiere",
    workers: "Tjenesteutf\u00f8rere",
    openMap: "\u00c5pne kart",
    contact: "Kontakt",
    contactLandlord: "Kontakt utleier",
    contactWorker: "Kontakt tjenesteutf\u00f8rer",
    roleAdmin: "Admin",
    roleLandlord: "Utleier",
    roleWorker: "Tjeneste",
  },
  en: {
    appName: "AirHost Ops",
    dashboard: "Dashboard",
    newOrder: "New order",
    profile: "Profile",
    users: "Users",
    logout: "Sign out",
    viewAsLandlord: "View as landlord",
    viewAsWorker: "View as service worker",
    login: "Sign in",
    loginSubtitle: "Internal system for Airbnb operations",
    invalidCredentials: "Invalid email or password",
    email: "Email",
    password: "Password",
    noAccount: "No account?",
    register: "Register",
    registerAccount: "Create account",
    name: "Name",
    passwordMin: "Password (min. 8)",
    roleLandlordOnly: "Landlord only",
    roleWorkerOnly: "Service worker only",
    roleBoth: "Both landlord and service worker",
    alreadyAccount: "Already have an account?",
    cannotRegister: "Could not register user",
    registerReasonEmailExists: "This email is already registered.",
    registerReasonInvalidPayload: "Invalid registration data. Check the fields and try again.",
    registerReasonDbUnavailable: "Registration is temporarily unavailable because the database is not reachable yet.",
    registerReasonUnknown: "Registration failed on the server. Please try again later.",
    overview: "Overview of jobs and activity",
    jobs: "Jobs",
    type: "Type",
    address: "Address",
    date: "Date",
    status: "Status",
    details: "Details",
    action: "Action",
    loadingJobs: "Loading jobs...",
    noJobs: "No jobs yet.",
    open: "Open",
    takeJob: "Take",
    assigned: "Assigned",
    cannotTakeJob: "Could not take job",
    takenJob: "Job assigned to you",
    activeJobs: "Active jobs",
    completedJobs: "Completed",
    landlords: "Landlords",
    workers: "Service workers",
    openMap: "Open map",
    contact: "Contact",
    contactLandlord: "Contact landlord",
    contactWorker: "Contact service worker",
    roleAdmin: "Admin",
    roleLandlord: "Landlord",
    roleWorker: "Service",
  },
};

const LanguageContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return "no";
    const stored = window.localStorage.getItem("app_lang");
    return stored === "en" || stored === "no" ? stored : "no";
  });

  const value = useMemo<I18n>(() => {
    return {
      lang,
      setLang: (next) => {
        setLang(next);
        window.localStorage.setItem("app_lang", next);
      },
      t: (key) => messages[lang][key] ?? key,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
