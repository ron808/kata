import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

// Display voice: heavy and a little condensed (see .font-display). The only preloaded
// face: it paints the largest text on every page.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
});

// Everything else: interface, your pages, Kata's messages and letters.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Kata · the journal that checks in on you",
  description:
    "Write a little each day. Kata keeps track of what you're working on, checks in on it, asks better questions, and lets you share the good bits with your people.",
  metadataBase: new URL("https://kata.app"),
  openGraph: {
    title: "Kata · the journal that checks in on you",
    description:
      "A daily journal with a companion that remembers what you're working on, and people to share it with.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5eddc" },
    { media: "(prefers-color-scheme: dark)", color: "#16120e" },
  ],
};

// Runs before first paint: marks JS as available (CSS stages the scroll scenes on it),
// applies a saved theme so there is no flash of the wrong one, and marks a returning
// signed-in visitor so the cached landing shows "Open Kata" at once (components/landing/Session.tsx).
const bootScript = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("kata-theme");if(t==="light"||t==="dark")d.dataset.theme=t;if(localStorage.getItem("kata-session")==="in")d.dataset.session="in"}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${instrumentSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
