import { Figtree, Fraunces, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Faces for the two looks that weren't chosen (Bricolage, the sticker book's, comes from
// the root layout). None is preloaded: only the look on screen renders text.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap", preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap", preload: false });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap", preload: false });

export const lookFonts = [instrumentSerif, geist, geistMono, fraunces, figtree].map((f) => f.variable).join(" ");
