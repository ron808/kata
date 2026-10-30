import { auth } from "@/lib/auth/authOptions";
import { meFrom } from "@/components/lab/cast";
import { conceptBySlug } from "@/components/lab/concepts";
import { CirclesPrototype } from "@/components/lab/circles/CirclesPrototype";

export const metadata = { title: "Circles · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  return <CirclesPrototype me={meFrom(session?.user?.name)} concept={conceptBySlug("circles")} />;
}
