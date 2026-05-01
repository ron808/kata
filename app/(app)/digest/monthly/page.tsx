import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Digest } from "@/lib/db/models/Digest";
import { DigestView } from "@/components/digest/DigestView";

export default async function MonthlyDigestPage() {
  const session = await auth();
  await connectDB();
  const digests = await Digest.find({
    userId: session!.user.id,
    type: "monthly",
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return (
    <DigestView
      type="monthly"
      digests={digests.map((d) => ({
        _id: String(d._id),
        type: d.type,
        periodStart: d.periodStart.toISOString(),
        periodEnd: d.periodEnd.toISOString(),
        content: d.content,
        entryCount: d.entryCount,
        wordCount: d.wordCount,
        isRead: d.isRead,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}
