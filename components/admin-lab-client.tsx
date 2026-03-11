"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "UTLEIER" | "TJENESTE";
  isActive: boolean;
  canLandlord: boolean;
  canService: boolean;
  activeMode: "UTLEIER" | "TJENESTE";
};

type OrderItem = {
  id: string;
  orderNumber: number;
  address: string;
  date: string | Date;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  type: "CLEANING" | "KEY_HANDLING";
  landlordId: string;
  assignedToId: string | null;
};

type AccessPreset = "landlord" | "worker" | "both" | "admin";

function mapPresetToCreatePayload(preset: AccessPreset) {
  if (preset === "worker") {
    return { role: "TJENESTE" as const, canLandlord: false, canService: true, activeMode: "TJENESTE" as const };
  }
  if (preset === "both") {
    return { role: "UTLEIER" as const, canLandlord: true, canService: true, activeMode: "UTLEIER" as const };
  }
  if (preset === "admin") {
    return { role: "ADMIN" as const, canLandlord: true, canService: true, activeMode: "UTLEIER" as const };
  }
  return { role: "UTLEIER" as const, canLandlord: true, canService: false, activeMode: "UTLEIER" as const };
}

export function AdminLabClient({
  initialUsers,
  initialOrders,
}: {
  initialUsers: UserItem[];
  initialOrders: OrderItem[];
}) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [busy, setBusy] = useState(false);
  const [createPreset, setCreatePreset] = useState<AccessPreset>("both");
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders[0]?.id ?? "");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const landlords = useMemo(() => users.filter((u) => u.isActive && u.canLandlord), [users]);
  const workers = useMemo(() => users.filter((u) => u.isActive && u.canService), [users]);
  const activeOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30),
    [orders],
  );

  const refreshData = async () => {
    const [usersRes, ordersRes] = await Promise.all([
      fetch("/api/users", { cache: "no-store" }),
      fetch("/api/orders", { cache: "no-store" }),
    ]);
    if (usersRes.ok) {
      const payload = (await usersRes.json()) as UserItem[];
      setUsers(payload);
    }
    if (ordersRes.ok) {
      const payload = (await ordersRes.json()) as OrderItem[];
      setOrders(payload);
    }
  };

  const createUser = async (formData: FormData) => {
    setBusy(true);
    const preset = mapPresetToCreatePayload(createPreset);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      ...preset,
    };
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Kunne ikke opprette bruker");
      return;
    }
    toast.success("Bruker opprettet");
    await refreshData();
  };

  const updateUser = async (user: UserItem, patch: Partial<UserItem>) => {
    setBusy(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Kunne ikke oppdatere bruker");
      return;
    }
    toast.success("Bruker oppdatert");
    await refreshData();
  };

  const createOrder = async (formData: FormData) => {
    setBusy(true);
    const startRaw = String(formData.get("date") ?? "");
    const deadlineRaw = String(formData.get("deadlineAt") ?? "");
    const start = new Date(startRaw);
    const deadline = new Date(deadlineRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(deadline.getTime())) {
      setBusy(false);
      toast.error("Ugyldig start/slutt dato");
      return;
    }
    const payload = {
      landlordId: String(formData.get("landlordId") ?? ""),
      type: String(formData.get("type") ?? "CLEANING"),
      address: String(formData.get("address") ?? "").trim(),
      date: start.toISOString(),
      deadlineAt: deadline.toISOString(),
      guestCount: Number(formData.get("guestCount") ?? 1),
      note: String(formData.get("note") ?? "").trim() || undefined,
    };
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Kunne ikke opprette testoppdrag");
      return;
    }
    toast.success("Testoppdrag opprettet");
    await refreshData();
  };

  const runOrderAction = async (action: "assign" | "start" | "complete" | "reset") => {
    if (!selectedOrderId) return;
    setBusy(true);
    let res: Response;
    if (action === "assign") {
      res = await fetch(`/api/orders/${selectedOrderId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: selectedWorkerId }),
      });
    } else if (action === "start") {
      res = await fetch(`/api/orders/${selectedOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
    } else if (action === "complete") {
      res = await fetch(`/api/orders/${selectedOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
    } else {
      res = await fetch(`/api/orders/${selectedOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      });
    }
    setBusy(false);
    if (!res.ok) {
      toast.error("Handling feilet");
      return;
    }
    toast.success("Handling utført");
    await refreshData();
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">Admin Testplattform</h1>
        <p className="text-sm text-slate-600">
          Full testflate for brukere, tilganger og oppdragsflyt i ett sted.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={createUser} className="panel grid gap-2 p-4">
          <h2 className="text-lg font-semibold">Opprett testbruker</h2>
          <input className="input" name="name" placeholder="Navn" required />
          <input className="input" type="email" name="email" placeholder="E-post" required />
          <input className="input" name="phone" placeholder="Telefon" required />
          <input className="input" type="password" name="password" placeholder="Passord (min. 8)" minLength={8} required />
          <select className="input" value={createPreset} onChange={(e) => setCreatePreset(e.target.value as AccessPreset)}>
            <option value="landlord">Kun utleier</option>
            <option value="worker">Kun tjenesteutfører</option>
            <option value="both">Begge tilganger</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn btn-primary w-fit" disabled={busy} type="submit">
            Opprett bruker
          </button>
        </form>

        <form action={createOrder} className="panel grid gap-2 p-4">
          <h2 className="text-lg font-semibold">Opprett testoppdrag</h2>
          <select className="input" name="landlordId" required>
            <option value="">Velg utleier</option>
            {landlords.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <select className="input" name="type" defaultValue="CLEANING">
            <option value="CLEANING">CLEANING</option>
            <option value="KEY_HANDLING">KEY_HANDLING</option>
          </select>
          <input className="input" name="address" placeholder="Adresse" required />
          <input className="input" type="datetime-local" name="date" required />
          <input className="input" type="datetime-local" name="deadlineAt" required />
          <input className="input" type="number" min={1} max={50} name="guestCount" defaultValue={1} />
          <textarea className="input" name="note" placeholder="Kommentar (valgfri)" />
          <button className="btn btn-primary w-fit" disabled={busy} type="submit">
            Opprett oppdrag
          </button>
        </form>
      </div>

      <div className="panel p-4">
        <h2 className="text-lg font-semibold">Oppdragssimulator</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <select className="input" value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}>
            <option value="">Velg oppdrag</option>
            {activeOrders.map((order) => (
              <option key={order.id} value={order.id}>
                #{order.orderNumber} · {order.address} · {order.status}
              </option>
            ))}
          </select>
          <select className="input" value={selectedWorkerId} onChange={(e) => setSelectedWorkerId(e.target.value)}>
            <option value="">Velg tjenesteutfører</option>
            {workers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-secondary" disabled={busy || !selectedOrderId || !selectedWorkerId} onClick={() => void runOrderAction("assign")}>
            Tildel
          </button>
          <button className="btn btn-danger" disabled={busy || !selectedOrderId} onClick={() => void runOrderAction("start")}>
            START
          </button>
          <button className="btn btn-primary" disabled={busy || !selectedOrderId} onClick={() => void runOrderAction("complete")}>
            FULLFØR
          </button>
          <button className="btn btn-secondary" disabled={busy || !selectedOrderId} onClick={() => void runOrderAction("reset")}>
            Sett PENDING
          </button>
          {selectedOrderId ? (
            <Link className="btn btn-secondary" href={`/orders/${selectedOrderId}`}>
              Åpne oppdrag
            </Link>
          ) : null}
        </div>
      </div>

      <div className="panel overflow-x-auto p-4">
        <h2 className="text-lg font-semibold">Brukere og tilgang</h2>
        <table className="mt-2 min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-2">Navn</th>
              <th className="pb-2">Rolle</th>
              <th className="pb-2">Utleier</th>
              <th className="pb-2">Tjeneste</th>
              <th className="pb-2">Aktiv modus</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="py-2">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="py-2">
                  <select className="input h-9 min-w-[120px] py-1" value={u.role} onChange={(e) => void updateUser(u, { role: e.target.value as UserItem["role"] })}>
                    <option value="UTLEIER">UTLEIER</option>
                    <option value="TJENESTE">TJENESTE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="py-2">
                  <input type="checkbox" checked={u.canLandlord} onChange={(e) => void updateUser(u, { canLandlord: e.target.checked })} />
                </td>
                <td className="py-2">
                  <input type="checkbox" checked={u.canService} onChange={(e) => void updateUser(u, { canService: e.target.checked })} />
                </td>
                <td className="py-2">
                  <select
                    className="input h-9 min-w-[120px] py-1"
                    value={u.activeMode}
                    onChange={(e) => void updateUser(u, { activeMode: e.target.value as UserItem["activeMode"] })}
                  >
                    <option value="UTLEIER">UTLEIER</option>
                    <option value="TJENESTE">TJENESTE</option>
                  </select>
                </td>
                <td className="py-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={u.isActive} onChange={(e) => void updateUser(u, { isActive: e.target.checked })} />
                    <span>{u.isActive ? "Aktiv" : "Deaktivert"}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
