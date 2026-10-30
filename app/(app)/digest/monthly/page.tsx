import { auth } from "@/lib/auth/authOptions";
import { DigestView } from "@/components/digest/DigestView";
import { loadLetters } from "@/components/digest/letters";

export default async function MonthlyDigestPage(props: { searchParams: Promise<{ letter?: string | string[] }> }) {
  const [session, params] = await Promise.all([auth(), props.searchParams]);
  const { digests, next } = await loadLetters(session!.user.id, "monthly");
  const letter = Array.isArray(params.letter) ? params.letter[0] : params.letter;
  return <DigestView type="monthly" digests={digests} initialId={letter} next={next} />;
}
