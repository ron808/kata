import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { CheckInAside } from "@/components/auth/AuthAsides";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "@/components/auth/LoginForm";

/** Only paths inside Kata: "/people" yes, "//evil.example" and "https://…" no. */
function safeNext(from: string | string[] | undefined): string {
  const path = Array.isArray(from) ? from[0] : from;
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/dashboard";
  if (path.startsWith("/login") || path.startsWith("/register")) return "/dashboard";
  return path;
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
