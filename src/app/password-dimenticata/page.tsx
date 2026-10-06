import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Password dimenticata", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Password dimenticata?"
      subtitle="Inserisci la tua email: ti mandiamo un link per sceglierne una nuova."
      footer={
        <Link href="/accedi" className="font-semibold text-ink underline underline-offset-4">
          Torna all&apos;accesso
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
