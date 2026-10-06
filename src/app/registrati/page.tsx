import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Crea un account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/registrati">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCurrentUser()) redirect("/viaggi");
  return (
    <AuthShell
      title="Crea il tuo account"
      subtitle="Gratis. Ti serve solo per salvare i viaggi e ritrovarli ovunque."
      footer={
        <>
          Hai già un account?{" "}
          <Link href={`/accedi${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-semibold text-brand-600">
            Accedi
          </Link>
        </>
      }
    >
      <RegisterForm next={nextPath} />
    </AuthShell>
  );
}
