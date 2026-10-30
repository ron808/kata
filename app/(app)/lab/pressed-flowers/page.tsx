import { auth } from "@/lib/auth/authOptions";
import { meFrom } from "@/components/lab/cast";
import { conceptBySlug } from "@/components/lab/concepts";
import { PressedFlowersPrototype } from "@/components/lab/pressed-flowers/PressedFlowersPrototype";

export const metadata = { title: "Pressed Flowers · The Lab · Kata" };

export default async function Page() {
  const session = await auth();
  return <PressedFlowersPrototype me={meFrom(session?.user?.name)} concept={conceptBySlug("pressed-flowers")} />;
}
