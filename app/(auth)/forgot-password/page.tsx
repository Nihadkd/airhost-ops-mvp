import { ForgotPasswordClient } from "@/components/forgot-password-client";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ForgotPasswordClient token={params.token ?? ""} />;
}
