"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, SPRING, Stagger, fadeUp } from "@/components/motion/Motion";
import { TierBadge } from "@/components/ui/Badge";
import { CloseIcon } from "@/components/ui/Icons";
import { TopBar } from "@/components/ui/TopBar";
import { Lotus, TemplateThumb, headingKm } from "@/components/invitation/TemplateArt";
import { cn } from "@/lib/cn";
import { useContent, useLanguage } from "@/lib/i18n";
import { formatEnglishDate, formatKhmerDate, formatPrice, formatTime } from "@/lib/khmer";
import { sampleInvitation as inv, templates, type EventType, type Template } from "@/lib/mock-data";
import { changeTemplate, createDraft } from "@/lib/store";

const content = {
  en: { title: "Pick a template", all: "All", live: "Live preview", use: "Use this template", closePreview: "Close preview", creating: "Creating…", failed: "Couldn't create the invitation. Check your connection and try again." },
  km: { title: "ជ្រើសរើសគំរូ", all: "ទាំងអស់", live: "មើលផ្ទាល់", use: "ប្រើគំរូនេះ", closePreview: "បិទការមើលជាមុន", creating: "កំពុងបង្កើត…", failed: "មិនអាចបង្កើតធៀបការបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត។" },
};

const BACK = "/app";

export function TemplatePicker() {
  const c = useContent(content);
  const { lang, t } = useLanguage();
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const [selected, setSelected] = useState<Template | null>(null);
  const shown = templates.filter((tpl) => filter === "all" || tpl.eventType === filter);
  const filters = [
    ["all", c.all],
    ["wedding", t.eventType.wedding],
    ["engagement", t.eventType.engagement],
  ] as const;

  return (
    <main className="mx-auto w-full max-w-[1000px]">
      <header className="sticky top-0 z-10 bg-ivory px-3 pt-2 pb-2.5">
        <TopBar backHref={BACK} title={c.title} />
        <div role="group" aria-label={c.title} className="flex gap-2 overflow-x-auto px-1 pt-2.5">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "relative min-h-11 cursor-pointer rounded-full border-[1.5px] px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                filter === value ? "border-charcoal text-white" : "border-line-strong bg-white text-charcoal",
              )}
            >
              {filter === value && (
                <motion.span layoutId="picker-filter" transition={SPRING} aria-hidden className="absolute -inset-[1.5px] rounded-full bg-charcoal" />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <Stagger as="ul" onMount stagger={0.06} delay={0.05} className="grid grid-cols-2 gap-3 px-4 pt-1.5 pb-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((tpl) => {
          const name = lang === "km" ? tpl.nameKm : tpl.nameEn;
          return (
            <motion.li
              key={tpl.id}
              layout
              variants={fadeUp}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
            >
              <motion.button
                type="button"
                onClick={() => setSelected(tpl)}
                aria-label={`${name} · ${t.tier[tpl.tier]} · ${formatPrice(tpl.priceUsd, lang).both}`}
                whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(43,43,43,0.12)" }}
                whileTap={{ scale: 0.97 }}
                className="flex w-full cursor-pointer flex-col gap-1.5 rounded-card bg-white p-2 text-left shadow-card"
              >
                <TemplateThumb template={tpl} size="md" className="h-[200px] lg:h-[240px]" />
                <div className="flex items-center justify-between gap-1 px-0.5">
                  <span className="truncate text-sm font-semibold">{name}</span>
                  <span className="text-[13px] font-bold text-maroon">{formatPrice(tpl.priceUsd, lang).usd}</span>
                </div>
                <div className="flex items-center justify-between gap-1 px-0.5 pb-0.5">
                  <TierBadge tier={tpl.tier} className="text-[11px]" />
                  <span className="text-[11px] text-muted">{formatPrice(tpl.priceUsd, lang).riel}</span>
                </div>
              </motion.button>
            </motion.li>
          );
        })}
        </AnimatePresence>
      </Stagger>

      <TemplatePreview template={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

/** Full-screen live preview in the template's own colours. */
function TemplatePreview({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const c = useContent(content);
  const { lang, t } = useLanguage();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failedDetail, setFailedDetail] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (template && !dialog.open) dialog.showModal();
    if (!template && dialog.open) dialog.close();
  }, [template]);

  // ?from=<draftId>: switching template for an existing draft (from the pay screen) keeps its details.
  const from = useSearchParams().get("from");

  async function chooseTemplate() {
    if (!template) return;
    setCreating(true);
    setFailed(false);
    try {
      if (from && (await changeTemplate(from, template.id))) {
        router.push(`/app/${from}/pay`);
        return;
      }
      const draft = await createDraft(template.id);
      router.push(`/app/${draft.id}/edit`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      // Session expired or missing: signing in again fixes it, so go there instead of showing an error.
      if (detail === "not_signed_in") {
        router.push("/signin");
        return;
      }
      console.error("Couldn't create invitation:", err);
      setCreating(false);
      setFailed(true);
      setFailedDetail(detail);
    }
  }

  const theme = template?.theme;
  const price = template ? formatPrice(template.priceUsd, lang) : null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={c.live}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-scrim"
    >
      {template && theme && price && (
        <motion.div
          key={template.id}
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="mx-auto flex h-full max-w-[480px] flex-col"
          style={{ background: theme.bg, color: theme.fg }}
        >
          <div className="flex items-center justify-between p-3">
            <button
              type="button"
              onClick={onClose}
              aria-label={c.closePreview}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/20"
            >
              <CloseIcon />
            </button>
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-[13px] font-semibold">{c.live}</span>
            <span className="w-11" />
          </div>

          <div
            className="relative mx-5 flex grow flex-col items-center justify-center overflow-y-auto rounded-2xl border p-6 text-center"
            style={{ borderColor: theme.accent }}
          >
            <div aria-hidden className="absolute inset-2 rounded-card border opacity-50" style={{ borderColor: theme.accent }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
            >
              <Lotus size={44} color={theme.accent} strokeWidth={1.2} />
            </motion.div>
            <div lang="km" className="mt-2.5 font-moul text-lg leading-[1.8]" style={{ color: theme.accent }}>
              {headingKm(template)}
            </div>
            <div className="mt-3 text-[13px] opacity-85">
              <span lang="km">សូមគោរពអញ្ជើញ</span> · <span lang="en">You are invited</span>
            </div>
            <div lang="km" className="mt-2.5 text-xl font-semibold">{inv.groomKm} &amp; {inv.brideKm}</div>
            <div lang="en" className="font-serif text-[28px] leading-snug italic">Dara &amp; Sophea</div>
            <div aria-hidden className="my-4 h-px w-20" style={{ background: theme.accent }} />
            <div lang="km" className="text-[15px] leading-[1.8]">{formatKhmerDate(inv.eventDate)}</div>
            <div lang="km" className="text-[13px]">{formatTime(inv.startTime, "km")}</div>
            <div lang="en" className="text-xs opacity-85">
              {formatEnglishDate(inv.eventDate)} · {formatTime(inv.startTime, "en")}
            </div>
            <div lang="km" className="mt-3.5 text-[13px]">{inv.venueNameKm}</div>
            <div lang="en" className="text-xs opacity-85">{inv.venueNameEn}</div>
          </div>

          <div className="flex flex-col gap-2 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-semibold">
                {lang === "km" ? template.nameKm : template.nameEn} · {t.tier[template.tier]}
              </span>
              <span className="font-bold whitespace-nowrap">{price.both}</span>
            </div>
            <motion.button
              type="button"
              onClick={chooseTemplate}
              disabled={creating}
              whileTap={{ scale: 0.97 }}
              className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-card px-5 text-[15px] font-semibold disabled:opacity-70"
              style={{ background: theme.accent, color: theme.ctaFg }}
            >
              {creating ? c.creating : c.use}
            </motion.button>
            {failed && (
              <p role="alert" className="text-center text-[13px]">
                {c.failed}
                {failedDetail && <span lang="en" className="mt-1 block text-[11px] opacity-75">{failedDetail}</span>}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </dialog>
  );
}
