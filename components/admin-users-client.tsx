"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "UTLEIER" | "TJENESTE";
  isActive: boolean;
};

export function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);

  const refresh = async () => {
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = (await res.json()) as User[];
    setUsers(data);
  };

  const createUser = async (formData: FormData) => {
    const payload = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      role: String(formData.get("role")),
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast.error("Kunne ikke opprette bruker");
      return;
    }

    toast.success("Bruker opprettet");
    await refresh();
  };

  const toggleActive = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (!res.ok) return toast.error("Kunne ikke oppdatere bruker");
    await refresh();
  };

  return (
    <div className="space-y-6">
      <form action={createUser} className="panel grid gap-3 p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Opprett bruker</h2>
        <input className="input" name="name" placeholder="Navn" required />
        <input className="input" type="email" name="email" placeholder="E-post" required />
        <input className="input" type="password" name="password" placeholder="Passord" required />
        <select className="input" name="role" defaultValue="UTLEIER">
          <option value="UTLEIER">UTLEIER</option>
          <option value="TJENESTE">TJENESTE</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button className="btn btn-primary md:col-span-2" type="submit">Opprett</button>
      </form>

      <div className="panel overflow-x-auto p-5">
        <h2 className="mb-3 text-lg font-semibold">Alle brukere</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2">Navn</th>
              <th className="pb-2">E-post</th>
              <th className="pb-2">Rolle</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Handling</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="py-2">{user.name}</td>
                <td className="py-2">{user.email}</td>
                <td className="py-2">{user.role}</td>
                <td className="py-2">{user.isActive ? "Aktiv" : "Deaktivert"}</td>
                <td className="py-2">
                  <button className="btn btn-secondary" onClick={() => toggleActive(user)}>
                    {user.isActive ? "Deaktiver" : "Aktiver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}