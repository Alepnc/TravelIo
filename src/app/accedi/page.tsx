import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Accedi", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/accedi">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : undefined;
  if (await getCurrentUser()) redirect(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/viaggi");
  return (
    <AuthShell
      title="Bentornato 👋"
      subtitle={nextPath?.startsWith("/viaggi") ? "Accedi per salvare e ritrovare i tuoi viaggi." : "Accedi per ritrovare i tuoi viaggi."}
      footer={
        <>
          Non hai un account?{" "}
          <Link href={`/registrati${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-semibold text-brand-600">
            Registrati gratis
          </Link>
        </>
      }
    >
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
