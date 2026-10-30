import Link from "next/link";
import { LetterAside } from "@/components/auth/AuthAsides";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ForgotForm } from "@/components/auth/ForgotForm";

export default function ForgotPage() {
  return (
    <AuthFrame
      title={
        <>
          Locked <span className="mark">out</span>?
        </>
      }
      says="It happens. Tell me the email you signed up with and I’ll send a link to choose a new password."
      switchTo={{ href: "/login", label: "Log in" }}
      aside={<LetterAside />}
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="link">
            Log in
          </Link>
        </>
      }
    >
      <ForgotForm />
    </AuthFrame>
  );
}
