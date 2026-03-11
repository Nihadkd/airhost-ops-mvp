import { RegisterVerifyClient } from "@/components/register-verify-client";

export default async function RegisterVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <RegisterVerifyClient token={params.token ?? ""} />;
}
