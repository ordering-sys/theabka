/**
 * Personal invitation greetings (Premium "special guests"). Pure, safe on client and server.
 * Title and companion keys match the check constraints on invitation_guests.
 */
export type GuestTitle = "" | "mr" | "mrs" | "miss" | "he" | "lok_chumteav" | "teacher_m" | "teacher_f";

export const GUEST_TITLES: Record<Exclude<GuestTitle, "">, { km: string; en: string }> = {
  mr: { km: "លោក", en: "Mr." },
  mrs: { km: "លោកស្រី", en: "Mrs." },
  miss: { km: "កញ្ញា", en: "Miss" },
  he: { km: "ឯកឧត្តម", en: "H.E." },
  lok_chumteav: { km: "លោកជំទាវ", en: "Lok Chumteav" },
  teacher_m: { km: "លោកគ្រូ", en: "Teacher" },
  teacher_f: { km: "អ្នកគ្រូ", en: "Teacher" },
};

/** Who comes with the guest; '' is no one. */
export type GuestCompanion = "" | "family" | "partner" | "wife" | "husband" | "friend";

export const GUEST_COMPANIONS: Record<Exclude<GuestCompanion, "">, { km: string; en: string }> = {
  family: { km: "និងក្រុមគ្រួសារ", en: "and family" },
  partner: { km: "និងគូស្នេហ៍", en: "and partner" },
  wife: { km: "និងភរិយា", en: "and wife" },
  husband: { km: "និងស្វាមី", en: "and husband" },
  friend: { km: "និងមិត្តភក្តិ", en: "and friend" },
};

/** The guest as the invitation addresses them. `id` links their RSVP back to them. */
export type InvitedGuest = { id: string; title: GuestTitle; nameKm: string; nameEn: string; companion: GuestCompanion };

/** "លោក សុខ ដារ៉ា និងក្រុមគ្រួសារ" */
export function guestNameKm(g: Pick<InvitedGuest, "title" | "nameKm" | "companion">): string {
  const title = g.title ? `${GUEST_TITLES[g.title].km} ` : "";
  const with_ = g.companion ? ` ${GUEST_COMPANIONS[g.companion].km}` : "";
  return `${title}${g.nameKm}${with_}`;
}

/** "Mr. Sok Dara and family". Falls back to the Khmer name when there's no English one. */
export function guestNameEn(g: Pick<InvitedGuest, "title" | "nameKm" | "nameEn" | "companion">): string {
  const name = g.nameEn.trim() || g.nameKm;
  const title = g.title ? `${GUEST_TITLES[g.title].en} ` : "";
  const with_ = g.companion ? ` ${GUEST_COMPANIONS[g.companion].en}` : "";
  return `${title}${name}${with_}`;
}

/** RSVP party size to start from: just them, or them plus someone. */
export function defaultPartySize(g: Pick<InvitedGuest, "companion">): number {
  return g.companion ? 2 : 1;
}

/** Ready-to-send bilingual message with the guest's own link. */
export function inviteMessage(
  g: Pick<InvitedGuest, "title" | "nameKm" | "nameEn" | "companion">,
  couple: { km: string; en: string },
  eventType: "wedding" | "engagement",
  url: string,
): string {
  const km = eventType === "wedding" ? "ពិធីមង្គលការ" : "ពិធីភ្ជាប់ពាក្យ";
  const en = eventType === "wedding" ? "wedding" : "engagement";
  return [
    `សូមគោរពអញ្ជើញ ${guestNameKm(g)} ចូលរួម${km}របស់ ${couple.km}។`,
    `Dear ${guestNameEn(g)}, you're invited to the ${en} of ${couple.en}.`,
    url,
  ].join("\n");
}
