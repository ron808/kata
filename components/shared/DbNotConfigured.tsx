export function DbNotConfigured({ error }: { error?: string | null }) {
  return (
    <div className="max-w-2xl mx-auto px-6 pt-24 pb-32">
      <div className="text-[11px] uppercase tracking-[0.22em] text-accent font-mono">
        Setup · required
      </div>
      <h1 className="font-serif italic text-5xl mt-4 leading-[1.05] tracking-tight">
        The library isn&#x2019;t open yet.
      </h1>
      <p className="text-text-secondary mt-5 text-[15px] leading-[1.75]">
        Kata needs a MongoDB connection before it can store your pages. Add a
        <code className="font-mono text-[13px] mx-1.5 px-1.5 py-0.5 bg-bg-elevated border border-border">MONGODB_URI</code>
        to your local{" "}
        <code className="font-mono text-[13px] mx-1 px-1.5 py-0.5 bg-bg-elevated border border-border">.env.local</code>
        and restart the dev server.
      </p>

      <div className="mt-10 border border-border bg-bg-surface">
        <div className="border-b border-border px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono">
          .env.local
        </div>
        <pre className="px-5 py-4 text-[13px] font-mono text-text-secondary overflow-x-auto">
{`MONGODB_URI="mongodb://localhost:27017/kata"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"`}
        </pre>
      </div>

      {error && (
        <div className="mt-6 border border-danger/40 bg-danger/5 px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-danger font-mono mb-2">
            Server said
          </div>
          <p className="text-sm text-text-primary font-mono break-words">{error}</p>
        </div>
      )}

      <p className="text-text-muted text-[13px] mt-8 leading-[1.7]">
        No Mongo handy? Spin up a free cluster on{" "}
        <span className="text-accent">MongoDB Atlas</span>, paste the
        connection string above, and you&#x2019;re writing in seconds.
      </p>
    </div>
  );
}
