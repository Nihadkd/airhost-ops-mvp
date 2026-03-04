"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/language-context";

type Props = {
  userId: string;
  role: "ADMIN" | "UTLEIER" | "TJENESTE";
};

export function OnboardingModal({ userId, role }: Props) {
  const { lang } = useLanguage();
  const storageKey = useMemo(() => `servnest_onboarding_seen_${userId}`, [userId]);
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) !== "1";
  });

  if (!open) return null;

  const copy =
    lang === "no"
      ? {
          title: "Velkommen til ServNest",
          subtitle: "Kort intro for å komme raskt i gang.",
          admin: [
            "Administrer brukere, oppdrag og tildeling i dashboardet.",
            "Klikk på navn i oppdrag for å åpne brukerprofil.",
            "Følg chat og status før du lukker et oppdrag.",
          ],
          landlord: [
            "Opprett oppdrag med adresse, dato og detaljer.",
            "Rediger oppdrag også etter publisering ved behov.",
            "Følg chatten for oppdateringer fra tjenesteutfører.",
          ],
          worker: [
            "Ta eller motta tildelte oppdrag fra dashboardet.",
            "Bruk chat i oppdraget for å avklare detaljer.",
            "Fullfør oppdrag med sjekkliste og beskjed til utleier.",
          ],
          button: "Kom i gang",
        }
      : {
          title: "Welcome to ServNest",
          subtitle: "A quick intro to get started fast.",
          admin: [
            "Manage users, jobs, and assignments from the dashboard.",
            "Click names in job rows to open user profiles.",
            "Track chat and status updates before closing jobs.",
          ],
          landlord: [
            "Create jobs with address, date, and details.",
            "Edit jobs even after publishing when needed.",
            "Use job chat to stay updated with the worker.",
          ],
          worker: [
            "Take or receive assigned jobs from the dashboard.",
            "Use in-job chat to coordinate details.",
            "Complete jobs with checklist and note to landlord.",
          ],
          button: "Get started",
        };

  const roleItems = role === "ADMIN" ? copy.admin : role === "UTLEIER" ? copy.landlord : copy.worker;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/45 p-4">
      <div className="mx-auto mt-24 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900">{copy.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {roleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <button
            className="btn btn-primary"
            onClick={() => {
              window.localStorage.setItem(storageKey, "1");
              setOpen(false);
            }}
          >
            {copy.button}
          </button>
        </div>
      </div>
    </div>
  );
}
