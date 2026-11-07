import { ImageResponse } from "next/og";
import { shareCard } from "@/lib/social/share";

/** The picture a chat shows for a shared profile link: the profile as a sticker. */

export const alt = "A profile on Kata";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The sticker book's paper, ink and hues (app/globals.css, light theme).
const PAPER = "#f5eddc";
const INK = "#1d1915";
const SEAL = "#e8452b";
const HUE = ["#ff6a4d", "#ffc23a", "#4fb0ff", "#34c88a", "#9c85ff", "#ff86c2", "#2ec5c5", "#ff9838"];
const TINT = ["#ffe1d9", "#fff0c7", "#dcefff", "#d5f4e6", "#ebe6ff", "#ffe1f0", "#d1f3f3", "#ffe5cc"];
const DEEP = ["#8c2611", "#6a4b00", "#0c4e85", "#0d6942", "#4a32b3", "#8d1e5b", "#0a6565", "#8a4200"];

/** Kata's own faces, cut down to the letters on this card. Without them the picture still draws, in the default face. */
async function font(family: string, axes: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:${axes}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const card = await shareCard((await params).handle);
  const name = clip(card?.name ?? "Kata", 40);
  const handle = card?.handle ?? "";
  const bio = clip(card?.bio ?? "", 120);
  const hue = card ? ((card.hue % 8) + 8) % 8 : 0;
  const initial = name.trim()[0]?.toUpperCase() ?? "K";
  const small = `@${handle} ${bio} Follow on Kata kata-day.vercel.app/@${handle}`;
  const [display, sans] = await Promise.all([
    font("Bricolage+Grotesque", "opsz,wdth,wght@96,84,800", `${name}${initial}`),
    font("Instrument+Sans", "wght@600", small),
  ]);
  const nameSize = name.length <= 10 ? 124 : name.length <= 16 ? 100 : name.length <= 24 ? 80 : 62;
  const fonts = [
    ...(display ? [{ name: "Bricolage", data: display, weight: 800 as const, style: "normal" as const }] : []),
    ...(sans ? [{ name: "Instrument", data: sans, weight: 600 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: PAPER, padding: 56, fontFamily: "Instrument", color: INK }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            background: TINT[hue],
            border: `4px solid ${INK}`,
            borderRadius: 44,
            boxShadow: `12px 12px 0 ${INK}`,
            padding: "48px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 236,
              height: 236,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              background: HUE[hue],
              border: `4px solid ${INK}`,
              boxShadow: `8px 8px 0 ${INK}`,
              transform: "rotate(-4deg)",
              fontFamily: "Bricolage",
              fontSize: 120,
            }}
          >
            {initial}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 56, height: "100%", justifyContent: "center" }}>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: nameSize, lineHeight: 0.92, letterSpacing: -3 }}>{name}</div>
            {handle ? <div style={{ display: "flex", marginTop: 20, fontSize: 38, color: DEEP[hue] }}>@{handle}</div> : null}
            {bio ? <div style={{ display: "flex", marginTop: 20, fontSize: 30, lineHeight: 1.3, color: "#3b342d" }}>{bio}</div> : null}
            <div style={{ display: "flex", alignItems: "center", marginTop: 36, fontSize: 28 }}>
              <div style={{ display: "flex", width: 34, height: 34, marginRight: 14, borderRadius: 10, background: SEAL, border: `3px solid ${INK}` }} />
              Follow on Kata
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) }
  );
}
