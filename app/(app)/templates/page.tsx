import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/db/mongoose";
import { Template } from "@/lib/db/models/Template";
import { User } from "@/lib/db/models/User";
import { AppPage, PageHeader } from "@/components/shared/AppPage";
import { DbNotConfigured } from "@/components/shared/DbNotConfigured";
import { Icon } from "@/components/shared/Icon";
import { Gallery } from "@/components/templates/Gallery";
import { myPages } from "@/lib/templates/mine";
import { hueOf } from "@/lib/social/dto";
import type { OwnPageT } from "@/lib/types";
import type { PageAuthor } from "@/components/templates/TemplateDialog";
import {
  hueFromId,
  questionCount,
  rolesFor,
  starterPages,
  type ActivePage,
  type GalleryPage,
} from "@/components/templates/data";

export const metadata = { title: "Gallery · Kata" };

async function load(
  userId: string | undefined
): Promise<{ people: GalleryPage[]; active: ActivePage | null; mine: OwnPageT[]; authors: Record<string, PageAuthor> }> {
  await connectDB();
  const [docs, user, mine] = await Promise.all([
    Template.find({ isPublished: true })
      .sort({ cloneCount: -1, updatedAt: -1 })
      .limit(48)
      .select("name description tags fields cloneCount credit userId")
      .lean(),
    userId ? User.findById(userId).select("activeTemplateId").lean() : null,
    userId ? myPages(userId) : [],
  ]);
  const activeDoc = user?.activeTemplateId
    ? await Template.findById(user.activeTemplateId).select("name clonedFrom fields").lean()
    : null;

  // Who made a page shows only when they chose to put their name on it (and never your own).
  const credited = docs.filter((t) => t.credit && String(t.userId) !== userId);
  const makers = new Map(
    (await User.find({ _id: { $in: credited.map((t) => t.userId) }, handle: { $ne: null } }).select("name handle hue").lean()).map((u) => [String(u._id), u])
  );
  const authors: Record<string, PageAuthor> = {};
  for (const t of credited) {
    const u = makers.get(String(t.userId));
    if (u?.handle) authors[String(t._id)] = { name: u.name, handle: u.handle, hue: hueOf(u) };
  }

  // What a visitor may see of a published page: its questions, and its maker only as above.
  const people: GalleryPage[] = docs.map((t) => {
    const id = String(t._id);
    return {
      key: id,
      source: "people",
      templateId: id,
      name: t.name,
      saveName: t.name,
      description: t.description ?? "",
      tags: t.tags ?? [],
      fields: [...(t.fields ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((f) => ({
          id: f.id,
          type: f.type,
          label: f.label,
          required: f.required,
          order: f.order,
          config: (f.config as Record<string, unknown>) ?? {},
        })),
      cloneCount: t.cloneCount ?? 0,
      hue: hueFromId(id),
      roles: rolesFor(t.tags ?? []),
    };
  });

  const active: ActivePage | null = activeDoc
    ? {
        name: activeDoc.name,
        clonedFrom: activeDoc.clonedFrom ? String(activeDoc.clonedFrom) : null,
        questions: questionCount(activeDoc.fields ?? []),
      }
    : null;

  return { people, active, mine, authors };
}

export default async function TemplateGalleryPage() {
  const session = await auth();
  let data: Awaited<ReturnType<typeof load>> | null = null;
  let dbError: string | null = null;
  try {
    data = await load(session?.user?.id);
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database unavailable";
  }
  if (!data) return <DbNotConfigured error={dbError} />;

  return (
    <AppPage>
      <PageHeader
        kicker="Gallery"
        title={
          <>
            Pages people <span className="mark">use</span>
          </>
        }
        lede="Start from someone else’s page, one of Kata’s starters, or a sentence about your days. Keep the questions that fit and drop the rest."
        actions={
          data.active ? (
            <Link href="/settings/template" className="chip max-w-full">
              <Icon name="pen" className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Your page: <span className="font-semibold">{data.active.name}</span>
              </span>
            </Link>
          ) : null
        }
      />
      <Gallery people={data.people} starters={starterPages()} active={data.active} mine={data.mine} authors={data.authors} />
    </AppPage>
  );
}
