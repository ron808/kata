import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { MapAside } from "@/components/auth/AuthAsides";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  if ((await auth())?.user?.id) redirect("/dashboard");
  return (
    <AuthFrame
      title={
        <>
          Meet <span className="mark">Kata</span>.
        </>
      }
      says="Make an account, then I’ll ask a few quick questions to set up your first page."
      switchTo={{ href: "/login", label: "Log in" }}
      aside={<MapAside />}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="link">
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthFrame>
  );
}
