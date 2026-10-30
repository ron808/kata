import { auth } from "@/lib/auth/authOptions";
import { meFrom } from "@/components/lab/cast";
import { conceptBySlug } from "@/components/lab/concepts";
import { KasanePrototype } from "@/components/lab/kasane/KasanePrototype";

export const metadata = { title: "Kasane · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  return <KasanePrototype me={meFrom(session?.user?.name)} concept={conceptBySlug("kasane")} />;
}
