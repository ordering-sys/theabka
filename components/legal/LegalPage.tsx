"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { cn } from "@/lib/cn";
import { COMPANY, LEGAL_UPDATED } from "@/lib/company";
import { useContent, useLanguage, type Lang } from "@/lib/i18n";
import { formatDayMonth, toKhmerNumerals } from "@/lib/khmer";
import { legalUi } from "./content";

/** A paragraph, a bullet list, or a paragraph ending in a link. */
export type LegalBlock = string | { list: string[] } | { text: string; link: { label: string; href: string } };

export type LegalDoc = {
  title: string;
  intro: string;
  sections: { heading: string; body: LegalBlock[] }[];
};

type Kind = "privacy" | "terms";

const OTHER: Record<Kind, { href: string; kind: Kind }> = {
  privacy: { href: "/terms", kind: "terms" },
  terms: { href: "/privacy", kind: "privacy" },
};

function formatUpdated(date: string, lang: Lang) {
  const year = date.slice(0, 4);
  return `${formatDayMonth(date, lang)} ${lang === "km" ? `ឆ្នាំ${toKhmerNumerals(year)}` : year}`;
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("list" in block) {
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-gold">
        {block.list.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }
  return (
    <p>
      {block.text}{" "}
      <a href={block.link.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-maroon underline">
        {block.link.label}
      </a>
    </p>
  );
}

/** Privacy Policy and Terms of Service: plain host-app styling, no ornaments. */
export function LegalPage({ kind, content }: { kind: Kind; content: Record<Lang, LegalDoc> }) {
  const { lang } = useLanguage();
  const doc = useContent(content);
  const ui = useContent(legalUi);
  const other = OTHER[kind];
  // Both titles stay visible so a reader of either language knows what the page is.
  const otherLang: Lang = lang === "km" ? "en" : "km";
  const altTitle = content[otherLang].title;

  return (
    <>
      <Header />
      <main lang={lang} className="mx-auto w-full max-w-2xl px-5 pt-8 pb-14 text-[15px] leading-[1.75] lg:pt-12">
        <h1 className={cn("text-maroon", lang === "km" ? "font-moul text-[22px] leading-[1.8] font-normal" : "font-serif text-[30px] leading-[1.3] font-bold")}>
          {doc.title}
        </h1>
        <p lang={otherLang} className="mt-1 text-sm text-muted">{altTitle} · {ui.langHint}</p>
        <p className="mt-3 text-[13px] text-muted">
          {ui.updated} {formatUpdated(LEGAL_UPDATED, lang)}
        </p>

        <p className="mt-6">{doc.intro}</p>

        {doc.sections.map((section, i) => (
          <section key={section.heading} className="mt-8">
            <h2 className="mb-2 text-[17px] font-bold text-charcoal">
              {lang === "km" ? toKhmerNumerals(i + 1) : i + 1}. {section.heading}
            </h2>
            <div className="space-y-3">
              {section.body.map((block, j) => <Block key={j} block={block} />)}
            </div>
          </section>
        ))}

        <Card className="mt-10">
          <h2 className="mb-1 text-[17px] font-bold">{ui.contactTitle}</h2>
          <p className="text-muted">{ui.contactBody[kind]}</p>
          <p className="mt-2">
            <a href={`mailto:${COMPANY.email}`} className="inline-flex min-h-11 items-center font-semibold text-maroon underline">
              {COMPANY.email}
            </a>
          </p>
          <p className="text-[13px] text-muted">
            {COMPANY.name} · {lang === "km" ? COMPANY.cityKm : COMPANY.cityEn}
          </p>
        </Card>

        <nav className="mt-8 flex flex-wrap gap-x-6 text-sm font-semibold">
          <Link href={other.href} className="flex min-h-11 items-center text-maroon underline">
            {ui.read[other.kind]}
          </Link>
          <Link href="/" className="flex min-h-11 items-center text-maroon underline">
            {ui.home}
          </Link>
        </nav>
      </main>
    </>
  );
}
