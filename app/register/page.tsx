import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { MapAside } from "@/components/auth/AuthAsides";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/RegisterForm";

/** `?follow=handle`: they came from someone's shared profile, and go back to it once they're set up. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ follow?: string }> }) {
  const raw = (await searchParams).follow;
  const follow = typeof raw === "string" && /^[a-z0-9_]{3,24}$/i.test(raw) ? raw.toLowerCase() : null;
  if ((await auth())?.user?.id) redirect(follow ? `/u/${follow}` : "/dashboard");
  const login = follow ? `/login?from=${encodeURIComponent(`/u/${follow}`)}` : "/login";
  return (
    <AuthFrame
      title={
        <>
          Meet <span className="mark">Kata</span>.
        </>
      }
      says="Make an account, then I’ll ask a few quick questions to set up your first page."
      switchTo={{ href: login, label: "Log in" }}
      aside={<MapAside />}
      footer={
        <>
          Already have an account?{" "}
          <Link href={login} className="link">
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm follow={follow} />
    </AuthFrame>
  );
}
