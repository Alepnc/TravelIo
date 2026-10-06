import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/auth-forms";
import { ErrorState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Nuova password", robots: { index: false } };

export default async function ResetPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Scegli una nuova password">
      {typeof token === "string" && token.length >= 20 ? (
        <ResetForm token={token} />
      ) : (
        <ErrorState title="Link non valido" description="Il link è incompleto o scaduto." action={<Link href="/password-dimenticata" className="font-semibold text-ink underline underline-offset-4">Richiedine uno nuovo</Link>} />
      )}
    </AuthShell>
  );
}
