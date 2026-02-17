"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function OrderCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const submit = async (formData: FormData) => {
    setLoading(true);
    const payload = {
      type: String(formData.get("type")),
      address: String(formData.get("address")),
      date: new Date(String(formData.get("date"))).toISOString(),
      note: String(formData.get("note") || ""),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Kunne ikke opprette bestilling");
      return;
    }

    toast.success("Bestilling opprettet");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form action={submit} className="panel mx-auto mt-6 max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold">Ny bestilling</h1>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">Tjeneste</span>
        <select name="type" className="input" required>
          <option value="CLEANING">Utvask</option>
          <option value="KEY_HANDLING">Nøkkelhåndtering</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">Dato</span>
        <input type="datetime-local" name="date" className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">Adresse</span>
        <input type="text" name="address" className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">Kommentar</span>
        <textarea name="note" className="input min-h-28" />
      </label>
      <button disabled={loading} className="btn btn-primary" type="submit">
        {loading ? "Lagrer..." : "Opprett bestilling"}
      </button>
    </form>
  );
}
