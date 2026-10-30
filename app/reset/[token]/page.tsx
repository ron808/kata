import Link from "next/link";
import { LetterAside } from "@/components/auth/AuthAsides";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ResetForm } from "@/components/auth/ResetForm";

export default async function ResetPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  return (
    <AuthFrame
      title={
        <>
          Choose a new <span className="mark">password</span>.
        </>
      }
      says="At least 8 characters. Then you’re back in."
      switchTo={{ href: "/login", label: "Log in" }}
      aside={<LetterAside />}
      footer={
        <>
          Link not working?{" "}
          <Link href="/forgot" className="link">
            Get a new one
          </Link>
        </>
      }
    >
      <ResetForm token={token} />
    </AuthFrame>
  );
}
