import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/authOptions";
import { AppShell } from "@/components/shared/AppShell";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
