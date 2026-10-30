import { auth } from "@/lib/auth/authOptions";
import { meFrom } from "@/components/lab/cast";
import { conceptBySlug } from "@/components/lab/concepts";
import { SundayPostPrototype } from "@/components/lab/sunday-post/SundayPostPrototype";

export const metadata = { title: "The Sunday Post · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  return <SundayPostPrototype me={meFrom(session?.user?.name)} concept={conceptBySlug("sunday-post")} />;
}
