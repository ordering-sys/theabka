import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatEnglishDate } from "@/lib/khmer";
import { getTemplate, templates } from "@/lib/mock-data";
import { findPublished, publishedSlugs } from "@/modules/guest/server/published";

export const alt = "TheabKa invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * English only on purpose: Satori (next/og) doesn't shape Khmer, so coeng
 * subscripts and pre-base vowels render broken. Khmer stays in the og:title,
 * which Telegram and Messenger render with the device's own fonts.
 * To add Khmer here later, pre-shape it to SVG paths (e.g. harfbuzzjs).
 */
const fontDir = join(process.cwd(), "assets/fonts");
const [inter, playfair] = await Promise.all([
  readFile(join(fontDir, "KantumruyPro-Regular.ttf")), // Latin glyphs for the date line
  readFile(join(fontDir, "PlayfairDisplay-Italic.ttf")),
]);

export function generateStaticParams() {
  return publishedSlugs();
}

/** 1200×630 link preview for Telegram / Messenger: couple's names and date. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inv = (await findPublished(slug))?.invitation;
  const template = (inv && getTemplate(inv.templateId)) ?? templates[0];
  const { bg, fg, accent } = template.theme;
  const short = (s: string) => s.split(" ").at(-1) || s;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: bg, color: fg, padding: 36 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${accent}`,
            borderRadius: 28,
            textAlign: "center",
          }}
        >
          <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.2">
            <path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9z" />
            <path d="M12 12c3-2 6-2 8 0-3 2-6 2-8 0z" />
            <path d="M12 12c-3-2-6-2-8 0 3 2 6 2 8 0z" />
          </svg>
          <div style={{ fontFamily: "Sans", fontSize: 28, letterSpacing: 6, color: accent, marginTop: 18 }}>
            {inv && template.eventType === "engagement" ? "ENGAGEMENT" : "WEDDING INVITATION"}
          </div>
          <div style={{ fontFamily: "Playfair", fontStyle: "italic", fontSize: 104, lineHeight: 1.15, marginTop: 10 }}>
            {inv ? `${short(inv.groomEn)} & ${short(inv.brideEn)}` : "TheabKa"}
          </div>
          {inv && (
            <>
              <div style={{ width: 120, height: 2, background: accent, margin: "28px 0" }} />
              <div style={{ fontFamily: "Sans", fontSize: 36 }}>{formatEnglishDate(inv.eventDate)}</div>
              <div style={{ fontFamily: "Sans", fontSize: 28, opacity: 0.85, marginTop: 6 }}>{inv.venueNameEn}</div>
            </>
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Sans", data: inter, weight: 400, style: "normal" },
        { name: "Playfair", data: playfair, weight: 400, style: "italic" },
      ],
    },
  );
}
