"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Me = {
  name: string;
  email: string;
  canLandlord: boolean;
  canService: boolean;
  activeMode: "UTLEIER" | "TJENESTE";
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
};

export function ProfileClient({ initialMe }: { initialMe: Me }) {
  const [me, setMe] = useState<Me>(initialMe);

  const switchMode = async (mode: "UTLEIER" | "TJENESTE") => {
    const res = await fetch("/api/users/me/mode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    if (!res.ok) {
      toast.error("Kunne ikke bytte modus");
      return;
    }

    const meRes = await fetch("/api/users/me", { cache: "no-store" });
    if (meRes.ok) setMe(await meRes.json());

    toast.success("Modus oppdatert");
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">Min profil</h1>
        <p className="text-sm text-slate-600">
          {me.name} - {me.email}
        </p>
      </div>

      <div className="panel space-y-3 p-5">
        <p>
          <strong>Aktiv visning:</strong> {me.activeMode}
        </p>
        <p>
          <strong>Tilgang:</strong> {me.canLandlord ? "Utleier " : ""}
          {me.canService ? "Tjenesteutfører" : ""}
        </p>
        {me.canLandlord && me.canService && (
          <div className="max-w-sm">
            <label className="mb-1 block text-sm">Bytt visning</label>
            <select className="input" value={me.activeMode} onChange={(e) => void switchMode(e.target.value as "UTLEIER" | "TJENESTE")}>
              <option value="UTLEIER">Vis appen som utleier</option>
              <option value="TJENESTE">Vis appen som tjenesteutfører</option>
            </select>
          </div>
        )}
      </div>
    </section>
  );
}
