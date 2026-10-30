import { auth } from "@/lib/auth/authOptions";
import { meFrom } from "@/components/lab/cast";
import { conceptBySlug } from "@/components/lab/concepts";
import { SealedPrototype } from "@/components/lab/sealed/SealedPrototype";

export const metadata = { title: "Sealed · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  return <SealedPrototype me={meFrom(session?.user?.name)} concept={conceptBySlug("sealed")} />;
}
