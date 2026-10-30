import { auth } from "@/lib/auth/authOptions";
import { meFrom } from "@/components/lab/cast";
import { conceptBySlug } from "@/components/lab/concepts";
import { ShelfPrototype } from "@/components/lab/shelf/ShelfPrototype";

export const metadata = { title: "Leaves & the Shelf · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  return <ShelfPrototype me={meFrom(session?.user?.name)} concept={conceptBySlug("shelf")} />;
}
