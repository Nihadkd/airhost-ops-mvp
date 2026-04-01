"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";
import { toUserErrorMessage } from "@/lib/client-error";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "UTLEIER" | "TJENESTE";
  isActive: boolean;
  canLandlord: boolean;
  canService: boolean;
  activeMode: "UTLEIER" | "TJENESTE";
  createdAt: string | Date;
  _count: {
    landlordOrders: number;
    assignedOrders: number;
    pushTokens: number;
  };
};

export function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const { t, lang } = useLanguage();
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const admins = users.filter((u) => u.role === "ADMIN").length;
  const landlords = users.filter((u) => u.role === "UTLEIER").length;
  const workers = users.filter((u) => u.role === "TJENESTE").length;
  const locale = lang === "no" ? "nb-NO" : "en-US";
  const formatCreatedAt = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString(locale);
  };
  const getRoleLabel = (role: User["role"]) => {
    if (role === "ADMIN") return t("roleAdmin");
    if (role === "UTLEIER") return t("roleLandlord");
    return t("roleWorker");
  };
  const getAccessLabel = (user: User) => {
    if (user.canLandlord && user.canService) return t("landlordAndWorkerAccess");
    if (user.canLandlord) return t("roleLandlord");
    if (user.canService) return t("roleWorker");
    return "-";
  };
  const getModeLabel = (mode: User["activeMode"]) => (mode === "UTLEIER" ? t("viewAsLandlord") : t("viewAsWorker"));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = normalizedQuery
    ? users.filter((user) =>
        [user.id, user.name, user.email, user.phone ?? ""].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : users;

  const refresh = async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = (await res.json()) as User[];
    setUsers(data);
  };

  useEffect(() => {
    if (initialUsers.length > 0) return;

    let cancelled = false;
    void fetch("/api/users", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: User[]) => {
        if (!cancelled) {
          setUsers(data);
        }
      })
      .catch(() => {
        // Keep the empty state when the initial refresh fails.
      });

    return () => {
      cancelled = true;
    };
  }, [initialUsers.length]);

  const createUser = async (formData: FormData) => {
    const payload = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      phone: String(formData.get("phone")),
      password: String(formData.get("password")),
      role: String(formData.get("role")),
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast.error(await toUserErrorMessage(res, t, "genericError"));
      return;
    }

    toast.success(t("userCreated"));
    await refresh();
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    await createUser(new FormData(form));
    form.reset();
  };

  const toggleActive = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (!res.ok) {
      toast.error(await toUserErrorMessage(res, t, "genericError"));
      return;
    }
    toast.success(t("userUpdated"));
    await refresh();
  };

  const deleteUser = async (user: User) => {
    const confirmed = window.confirm(`${t("confirmDeleteUser")} ${user.name}?`);
    if (!confirmed) return;

    const res = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error(await toUserErrorMessage(res, t, "deleteUserFailed"));
      return;
    }
    toast.success(t("userDeleted"));
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-bold">{t("fullUserOverviewTitle")}</h1>
        <p className="text-sm text-slate-600">{t("fullUserOverviewSubtitle")}</p>
      </div>
      <form onSubmit={(event) => void handleCreateUser(event)} className="panel grid gap-3 p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">{t("createUserTitle")}</h2>
        <input className="input" name="name" placeholder={t("name")} required />
        <input className="input" type="email" name="email" placeholder={t("email")} required />
        <input className="input" type="tel" name="phone" placeholder={t("phone")} required />
        <input className="input" type="password" name="password" placeholder={t("password")} required />
        <select className="input" name="role" defaultValue="UTLEIER">
          <option value="UTLEIER">{t("roleLandlord")}</option>
          <option value="TJENESTE">{t("roleWorker")}</option>
          <option value="ADMIN">{t("roleAdmin")}</option>
        </select>
        <button className="btn btn-primary md:col-span-2" type="submit">{t("create")}</button>
      </form>

      <div id="delete" className="panel overflow-x-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">{t("allUsersTitle")}</h2>
        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><strong>{t("totalLabel")}:</strong> {totalUsers}</div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><strong>{t("activePluralLabel")}:</strong> {activeUsers}</div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><strong>{t("adminsLabel")}:</strong> {admins}</div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><strong>{t("landlordsLabel")}:</strong> {landlords}</div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><strong>{t("workersLabel")}:</strong> {workers}</div>
        </div>
        <div className="mb-4">
          <input
            className="input max-w-md"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchUsers")}
            aria-label={t("searchUsers")}
          />
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2">ID</th>
              <th className="pb-2">{t("name")}</th>
              <th className="pb-2">{t("email")}</th>
              <th className="pb-2">{t("phone")}</th>
              <th className="pb-2">{t("role")}</th>
              <th className="pb-2">{t("permissionsLabel")}</th>
              <th className="pb-2">{t("activeModeLabel")}</th>
              <th className="pb-2">{t("createdLabel")}</th>
              <th className="pb-2">{t("landlordOrdersLabel")}</th>
              <th className="pb-2">{t("assignedOrdersLabel")}</th>
              <th className="pb-2">{t("pushLabel")}</th>
              <th className="pb-2">{t("userStatus")}</th>
              <th className="pb-2">{t("action")}</th>
              <th className="pb-2">{t("deleteUser")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{user.id.slice(0, 8)}</td>
                <td className="py-2">{user.name}</td>
                <td className="py-2">{user.email}</td>
                <td className="py-2">{user.phone ?? "-"}</td>
                <td className="py-2">{getRoleLabel(user.role)}</td>
                <td className="py-2">{getAccessLabel(user)}</td>
                <td className="py-2">{getModeLabel(user.activeMode)}</td>
                <td className="py-2">{formatCreatedAt(user.createdAt)}</td>
                <td className="py-2">{user._count.landlordOrders}</td>
                <td className="py-2">{user._count.assignedOrders}</td>
                <td className="py-2">{user._count.pushTokens}</td>
                <td className="py-2">{user.isActive ? t("userActive") : t("userInactive")}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-secondary" onClick={() => toggleActive(user)}>
                      {user.isActive ? t("deactivate") : t("activate")}
                    </button>
                  </div>
                </td>
                <td className="py-2">
                  <button className="btn btn-danger whitespace-nowrap" onClick={() => void deleteUser(user)}>
                    {t("deleteUser")}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-4 text-sm text-slate-500">
                  {t("noUsersMatchSearch")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
