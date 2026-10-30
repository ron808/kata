/** A sticker-book skeleton: the page's header and a few blank stickers, still while the page arrives. */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-full bg-ink/[0.08] ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[72rem] px-margin pb-20 pt-[clamp(1.75rem,4.5vw,3.75rem)]">
      {/* A slim progress line so the click visibly registered. It runs once; it doesn't loop. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] overflow-clip">
        <div className="h-full origin-left animate-[kata-progress_2.4s_var(--ease-out)_forwards] bg-accent" />
      </div>
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading…</span>
        <div aria-hidden>
          <Bar className="h-4 w-36" />
          <div className="mt-4 h-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)] w-[min(26rem,85%)] rounded-md bg-ink/[0.08]" />
          <Bar className="mt-5 h-4 w-[min(30rem,70%)]" />

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="card p-5 sm:p-7 lg:col-span-7">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-[10px] bg-accent/25" />
                <div className="space-y-2">
                  <Bar className="h-3.5 w-20" />
                  <Bar className="h-3 w-32" />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-12 w-[min(20rem,80%)] rounded-[22px] rounded-tl-md bg-ink/[0.1]" />
                <div className="h-12 w-[min(14rem,60%)] rounded-[22px] rounded-tl-md bg-ink/[0.1]" />
                <div className="ml-auto h-11 w-[min(11rem,45%)] rounded-[22px] rounded-tr-md bg-sun/45" />
              </div>
              <div className="mt-6 h-[3.25rem] rounded-[18px] border-2 border-edge/20" />
            </div>

            <div className="grid grid-cols-1 content-start gap-6 lg:col-span-5">
              <div className="card p-5 sm:p-7">
                <Bar className="h-6 w-40" />
                <div className="mt-6 space-y-4">
                  <Bar className="h-3.5 w-full" />
                  <Bar className="h-3.5 w-11/12" />
                  <Bar className="h-3.5 w-2/3" />
                </div>
              </div>
              <div className="relative -rotate-[1.4deg] rounded-lg border-2 border-dashed border-edge/35 px-5 pb-6 pt-7">
                <span className="tape" />
                <Bar className="h-5 w-20" />
                <Bar className="mt-4 h-4 w-11/12" />
                <Bar className="mt-2.5 h-4 w-3/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
