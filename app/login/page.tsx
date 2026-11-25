import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { CheckInAside } from "@/components/auth/AuthAsides";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";

const HOME = "https://kata.invalid";

/**
 * Only paths inside Kata: "/people" yes, "//evil.example", "https://…" and "/\t/evil.example"
 * (browsers drop tabs and newlines, which turns it into "//evil.example") no. The path is read
 * the way a browser will read it, and only what stays on Kata's own origin is kept.
 */
function safeNext(from: string | string[] | undefined): string {
  const path = Array.isArray(from) ? from[0] : from;
  if (!path || !path.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(path)) return "/dashboard";
  let url: URL;
  try {
    url = new URL(path, HOME);
  } catch {
    return "/dashboard";
  }
  if (url.origin !== HOME) return "/dashboard";
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/register")) return "/dashboard";
  return url.pathname + url.search + url.hash;
}

export default async function LoginPage(props: { searchParams: Promise<{ from?: string | string[] }> }) {
  const { from } = await props.searchParams;
  // Already signed in: carry on to wherever they were headed.
  if ((await auth())?.user?.id) redirect(safeNext(from));
  return (
    <AuthFrame
      title={
        <>
          Welcome <span className="mark">back</span>.
        </>
      }
      says="Log in and I’ll pick up where we left off."
      switchTo={{ href: "/register", label: "Create account" }}
      aside={<CheckInAside />}
      footer={
        <>
          New to Kata?{" "}
          <Link href="/register" className="link">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext(from)} />
    </AuthFrame>
  );
}
