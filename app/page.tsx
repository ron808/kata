import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { LandingHero } from "@/components/landing/LandingHero";
import { RolePreview } from "@/components/landing/RolePreview";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { TemplateGalleryTeaser } from "@/components/landing/TemplateGalleryTeaser";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg-base/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/login"
              className="text-text-secondary hover:text-text-primary px-4 py-2 rounded-md transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="bg-accent hover:bg-accent-hover text-bg-base font-medium px-4 py-2 rounded-md transition-colors"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <RolePreview />
        <FeatureHighlights />
        <TemplateGalleryTeaser />

        <section className="py-24 px-6 border-t border-border/60">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-serif italic text-3xl md:text-5xl leading-[1.15] tracking-tight text-text-primary">
              &ldquo;The good kind of habit isn&apos;t loud — <span className="text-accent">it&apos;s the quiet thing you keep showing up for.</span>&rdquo;
            </p>
            <div className="mt-10 flex items-center justify-center gap-6">
              <Link
                href="/register"
                className="bg-accent hover:bg-accent-hover text-bg-base font-medium px-7 py-4 rounded-md btn-glow transition-colors inline-flex items-center gap-2"
              >
                Begin volume one <span aria-hidden>→</span>
              </Link>
              <Link
                href="/login"
                className="text-text-secondary hover:text-text-primary text-base"
              >
                Already writing? Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-sm text-text-muted items-start">
          <div>
            <Logo className="text-text-primary" />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em]">
              型 — form, structure, pattern
            </p>
          </div>
          <nav className="flex flex-col gap-1.5 text-text-secondary">
            <span className="text-[11px] uppercase tracking-[0.22em] text-text-muted font-mono mb-1">
              The journal
            </span>
            <Link href="/login" className="hover:text-accent">Log in</Link>
            <Link href="/register" className="hover:text-accent">Start writing</Link>
          </nav>
          <div className="font-serif italic text-text-secondary text-lg leading-snug">
            A small, slow website. Built to be useful for a long time.
          </div>
        </div>
      </footer>
    </div>
  );
}
