import { exportPages } from "@/lib/account";
import { handleError, requireUser } from "@/lib/api";
import { namesFor } from "@/lib/companion/naming";
import { connectDB } from "@/lib/db/mongoose";

/** Every page they wrote, as a Markdown file to keep: offered before starting fresh or deleting the account. */
export async function GET() {
  try {
    const { session, response } = await requireUser();
    if (response) return response;
    await connectDB();
    const { name } = await namesFor(session.user.id);
    const { filename, text } = await exportPages(session.user.id, name);
    return new Response(text, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
