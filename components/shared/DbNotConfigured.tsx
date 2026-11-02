import { AppPage, PageHeader } from "./AppPage";
import { KataMark } from "./Avatar";

/** Kata can't reach MongoDB. Setup steps are for whoever's running it locally, not for writers. */
export function DbNotConfigured({ error }: { error?: string | null }) {
  if (process.env.NODE_ENV === "production") {
    return (
      <AppPage width="text">
        <PageHeader title="Kata can’t reach its database right now." lede="Reload in a moment." />
      </AppPage>
    );
  }
  return (
    <AppPage width="text">
      <PageHeader
        title={
          <>
            Kata can’t reach its <span className="mark">database</span>.
          </>
        }
        lede="Pages, threads and check-ins all live in MongoDB. Once it’s connected, this page fills in."
      />
      <section aria-label="How to connect it" className="card mt-10 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <KataMark size={36} cut="surface" />
          <p className="bubble-kata px-4 py-2.5 text-[0.9375rem] leading-snug">
            <span className="sr-only">Maru says: </span>
            Add a MONGODB_URI to .env.local, then restart the dev server. I’ll be right here.
          </p>
        </div>
        <figure className="well mt-6 overflow-clip">
          <figcaption className="rule border-b-2 px-5 py-3 text-sm font-semibold text-ink/70">.env.local</figcaption>
          <pre className="overflow-x-auto px-5 py-4 text-[0.875rem] leading-relaxed">
            {`MONGODB_URI="mongodb://localhost:27017/kata"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"`}
          </pre>
        </figure>

        {error ? (
          <div data-hue="0" className="mt-5 rounded-md border-2 border-edge bg-tint px-5 py-4 text-deep">
            <p className="text-sm font-semibold">The server said</p>
            <p className="mt-1 text-[0.9375rem] [overflow-wrap:anywhere]">{error}</p>
          </div>
        ) : null}

        <p className="mt-6 text-[0.9375rem] text-ink/75">
          No Mongo handy? A free MongoDB Atlas cluster works: paste its connection string above and restart.
        </p>
      </section>
    </AppPage>
  );
}
