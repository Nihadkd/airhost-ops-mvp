"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  reviewer: { id: string; name: string };
};

type UserProfile = {
  id: string;
  name: string;
  role: "ADMIN" | "UTLEIER" | "TJENESTE";
};

export function UserPublicProfileClient({
  user,
  reviews,
}: {
  user: UserProfile;
  reviews: Review[];
}) {
  const { t, lang } = useLanguage();
  const [sending, setSending] = useState(false);
  const locale = lang === "no" ? "nb-NO" : "en-US";

  const roleLabel =
    user.role === "ADMIN" ? t("roleAdmin") : user.role === "UTLEIER" ? t("roleLandlord") : t("roleWorker");

  const average = useMemo(() => {
    if (reviews.length === 0) return null;
    const total = reviews.reduce((sum, item) => sum + item.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const sendMessage = async (formData: FormData) => {
    const message = String(formData.get("message") ?? "").trim();
    if (!message) return;

    setSending(true);
    const res = await fetch(`/api/users/${user.id}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setSending(false);

    if (!res.ok) {
      toast.error(t("cannotSendMessage"));
      return;
    }
    toast.success(t("messageSent"));
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("role")}: {roleLabel}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {t("reviews")} ({reviews.length})
          {average ? ` - ${t("averageRating")}: ${average}/5` : ""}
        </p>
      </div>

      <div className="panel p-5">
        <h2 className="text-lg font-semibold">{t("feedbackFromOthers")}</h2>
        <div className="mt-3 space-y-3">
          {reviews.length === 0 && <p className="text-sm text-slate-500">{t("noReviewsYet")}</p>}
          {reviews.map((review) => (
            <article key={review.id} className="rounded border border-slate-200 p-3">
              <p className="font-semibold">
                {"*".repeat(review.rating)}
                {"-".repeat(5 - review.rating)}
              </p>
              <p className="mt-1 text-sm">{review.comment}</p>
              <p className="mt-2 text-xs text-slate-500">
                {review.reviewer.name} - {new Date(review.createdAt).toLocaleDateString(locale)}
              </p>
            </article>
          ))}
        </div>
      </div>

      <form action={sendMessage} className="panel space-y-3 p-5">
        <h2 className="text-lg font-semibold">{t("sendMessage")}</h2>
        <textarea name="message" className="input min-h-24" placeholder={t("writeMessage")} required />
        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? t("sending") : t("send")}
        </button>
      </form>
    </section>
  );
}
