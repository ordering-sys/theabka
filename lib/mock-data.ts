/**
 * Static catalogue (plans, templates, built-in songs; the database seeds the
 * same ids) and the shared invitation types. The sample couple and RSVPs are
 * demo content for the landing page and placeholder hints only: real hosts'
 * data always comes from Supabase through lib/store.ts.
 *
 * Note: the spec says "Sunday 15 December 2026", but 15 Dec 2026 is a Tuesday.
 * The prototypes use Sunday 13 December 2026, so we do too.
 */

export type EventType = "wedding" | "engagement";
export type Tier = "basic" | "premium";
export type InvitationStatus = "draft" | "live";

export const PLANS = {
  basic: { priceUsd: 5, priceKhr: 20_000, maxPhotos: 3, customMusic: false },
  premium: { priceUsd: 15, priceKhr: 60_000, maxPhotos: 6, customMusic: true },
} as const satisfies Record<Tier, { priceUsd: number; priceKhr: number; maxPhotos: number; customMusic: boolean }>;

export type Template = {
  id: string;
  nameKm: string;
  nameEn: string;
  eventType: EventType;
  tier: Tier;
  priceUsd: number;
  thumbnailUrl: string | null;
  theme: { bg: string; fg: string; accent: string; ctaFg: string };
};

const t = (
  id: string, nameKm: string, nameEn: string, eventType: EventType, tier: Tier,
  bg: string, fg: string, accent: string, ctaFg: string,
): Template => ({
  id, nameKm, nameEn, eventType, tier,
  priceUsd: PLANS[tier].priceUsd,
  thumbnailUrl: null,
  theme: { bg, fg, accent, ctaFg },
});

export const templates: Template[] = [
  t("royal", "ក្រហមរាជ", "Royal Maroon", "wedding", "premium", "#7A1F2B", "#FBF6EE", "#C9A24B", "#2B2B2B"),
  t("lotus", "ផ្កាឈូកមាស", "Golden Lotus", "wedding", "premium", "#FBF6EE", "#2B2B2B", "#8A6A1F", "#FFFFFF"),
  t("jasmine", "ផ្កាម្លិះ", "Jasmine", "wedding", "basic", "#FFFFFF", "#2B2B2B", "#4C7564", "#FFFFFF"),
  t("angkor", "អង្គរពេលព្រលប់", "Angkor Dusk", "wedding", "premium", "#3B2A4A", "#F6EEDD", "#D9B866", "#2B2B2B"),
  t("ivory", "ភ្លុកបុរាណ", "Classic Ivory", "wedding", "basic", "#F4ECDD", "#2B2B2B", "#7A1F2B", "#FFFFFF"),
  t("rumduol", "រំដួល", "Rumduol", "engagement", "basic", "#F3E3C3", "#2B2B2B", "#7A4A12", "#FFFFFF"),
  t("jade", "សួនមរកត", "Jade Garden", "engagement", "premium", "#3F6B5B", "#F6EEDD", "#E3C277", "#2B2B2B"),
  t("rose", "កុលាបសូត្រ", "Silk Rose", "engagement", "basic", "#F2DCD7", "#2B2B2B", "#8E3B46", "#FFFFFF"),
];

export type ScheduleItem = { id?: string; time: string; titleKm: string; titleEn: string };

export type Invitation = {
  id: string;
  userId: string;
  templateId: string;
  slug: string;
  status: InvitationStatus;
  brideKm: string;
  brideEn: string;
  groomKm: string;
  groomEn: string;
  parents: {
    groom: { fatherKm: string; motherKm: string; fatherEn: string; motherEn: string };
    bride: { fatherKm: string; motherKm: string; fatherEn: string; motherEn: string };
  };
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  venueNameKm: string;
  venueNameEn: string;
  venueAddressKm: string;
  venueAddressEn: string;
  lat: number;
  lng: number;
  schedule: ScheduleItem[];
  coverPhotoId: string | null;
  musicUrl: string | null;
  musicMutedDefault: boolean;
  giftQrUrl: string | null;
  giftNoteKm: string | null;
  giftNoteEn: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Photo = { id: string; invitationId: string; url: string; position: number };

export type MusicTrack = { id: string; nameKm: string; nameEn: string; styleKm: string; styleEn: string; duration: string; url: string };

/** The 5 built-in tracks. Audio files aren't in the repo yet; `url` is where they'll live. */
export const musicTracks: MusicTrack[] = [
  { id: "sarika", nameKm: "ភ្លេងការ សារិកាកែវ", nameEn: "Sarika Keo (traditional wedding music)", styleKm: "ភ្លេងប្រពៃណី", styleEn: "Traditional", duration: "3:12", url: "/music/sarika.mp3" },
  { id: "lotus", nameKm: "ផ្កាឈូករីក", nameEn: "Lotus in Bloom", styleKm: "ព្យ៉ាណូ", styleEn: "Piano", duration: "2:48", url: "/music/lotus.mp3" },
  { id: "forever", nameKm: "ស្នេហាអមតៈ", nameEn: "Forever Love", styleKm: "អាកូស្ទិក", styleEn: "Acoustic", duration: "3:30", url: "/music/forever.mp3" },
  { id: "mangala", nameKm: "ពិធីមង្គល", nameEn: "Mangala Ceremony", styleKm: "ភ្លេងខ្មែរ", styleEn: "Khmer instrumental", duration: "2:55", url: "/music/mangala.mp3" },
  { id: "golden", nameKm: "ថ្ងៃមាស", nameEn: "Golden Day", styleKm: "ភ្លេងខ្សែ", styleEn: "Strings", duration: "3:05", url: "/music/golden.mp3" },
];

/** Demo invitation for the landing page, template art and editor placeholders. */
export const sampleInvitation: Invitation = {
  id: "inv_dara_sophea",
  userId: "user_dara",
  templateId: "royal",
  slug: "dara-sophea",
  status: "live",
  groomKm: "សុខ ដារ៉ា",
  groomEn: "Sok Dara",
  brideKm: "ចាន់ សុភា",
  brideEn: "Chan Sophea",
  parents: {
    groom: { fatherKm: "លោក សុខ វណ្ណា", motherKm: "លោកស្រី ម៉ម សុខា", fatherEn: "Mr. Sok Vanna", motherEn: "Mrs. Mom Sokha" },
    bride: { fatherKm: "លោក ចាន់ ពិសិដ្ឋ", motherKm: "លោកស្រី លី សុភាព", fatherEn: "Mr. Chan Piseth", motherEn: "Mrs. Ly Sopheap" },
  },
  eventDate: "2026-12-13",
  startTime: "07:00",
  venueNameKm: "សណ្ឋាគារ សុខា ភ្នំពេញ",
  venueNameEn: "Sokha Phnom Penh Hotel",
  venueAddressKm: "ផ្លូវកែវចិន្ដា សង្កាត់ជ្រោយចង្វារ ភ្នំពេញ",
  venueAddressEn: "Keo Chenda Street, Chroy Changvar, Phnom Penh",
  lat: 11.5869,
  lng: 104.9282,
  schedule: [
    { time: "07:00", titleKm: "ពិធីកាត់សក់", titleEn: "Hair-cutting ceremony" },
    { time: "09:00", titleKm: "ពិធីសូត្រមន្តចម្រើនព្រះបរិត្ត", titleEn: "Monk blessing" },
    { time: "11:00", titleKm: "ពិធីចងដៃ", titleEn: "Hand-tying ceremony" },
    { time: "17:00", titleKm: "ពិធីជប់លៀងអាពាហ៍ពិពាហ៍", titleEn: "Wedding reception" },
  ],
  coverPhotoId: "photo_s1",
  musicUrl: "/music/sarika.mp3",
  musicMutedDefault: false,
  giftQrUrl: "/sample/khqr.svg",
  giftNoteKm: "អរគុណសម្រាប់ការជូនពរ។",
  giftNoteEn: "Thank you for your blessings.",
  publishedAt: "2026-11-10T09:00:00+07:00",
  createdAt: "2026-11-08T14:20:00+07:00",
  updatedAt: "2026-11-10T09:00:00+07:00",
};

/**
 * What a brand-new invitation starts with: the host's own details are empty
 * (the editor shows the sample couple as placeholder hints). The map pin starts
 * in Phnom Penh, the first built-in song is selected, and the gift note is the
 * generic thank-you, since those are fine for most hosts as they are.
 */
export const blankInvitationContent = {
  groomKm: "",
  groomEn: "",
  brideKm: "",
  brideEn: "",
  parents: {
    groom: { fatherKm: "", motherKm: "", fatherEn: "", motherEn: "" },
    bride: { fatherKm: "", motherKm: "", fatherEn: "", motherEn: "" },
  },
  eventDate: "",
  startTime: "",
  venueNameKm: "",
  venueNameEn: "",
  venueAddressKm: "",
  venueAddressEn: "",
  lat: sampleInvitation.lat,
  lng: sampleInvitation.lng,
  schedule: [],
  coverPhotoId: null,
  musicUrl: sampleInvitation.musicUrl,
  musicMutedDefault: false,
  giftQrUrl: null,
  giftNoteKm: sampleInvitation.giftNoteKm,
  giftNoteEn: sampleInvitation.giftNoteEn,
} satisfies Partial<Invitation>;

export type Rsvp = {
  id: string;
  invitationId: string;
  guestName: string;
  attending: boolean;
  partySize: number;
  message: string | null;
  createdAt: string; // YYYY-MM-DD
};

const rsvpRows: [string, boolean, number, string, string][] = [
  ["ចាន់ ធីតា", true, 2, "សូមជូនពរឲ្យមានសុភមង្គល!", "2026-11-20"],
  ["Sopheak Lim", true, 1, "Congratulations, see you there!", "2026-11-20"],
  ["ហេង សុវណ្ណ", true, 4, "", "2026-11-20"],
  ["Ratha Keo", false, 1, "Sorry, I will be in Siem Reap. Best wishes!", "2026-11-19"],
  ["សុខ ពិសី", true, 3, "រីករាយណាស់!", "2026-11-19"],
  ["Vannak Chea", true, 2, "", "2026-11-19"],
  ["ម៉ៅ សុជាតា", true, 2, "ជូនពរឲ្យស្រឡាញ់គ្នារហូត", "2026-11-18"],
  ["Dalin Pov", true, 1, "", "2026-11-18"],
  ["គឹម សុខា", false, 1, "សុំទោស មិនអាចចូលរួមបាន", "2026-11-18"],
  ["Bopha Nhem", true, 2, "So happy for you both!", "2026-11-17"],
  ["អ៊ុំ វិសាល", true, 5, "", "2026-11-17"],
  ["Pisey Tan", true, 2, "", "2026-11-17"],
  ["ឡុង ចន្ទា", true, 2, "សូមអបអរសាទរ", "2026-11-16"],
  ["Kosal Meas", true, 1, "See you at the reception", "2026-11-16"],
  ["ប៉ិច សុភាព", true, 3, "", "2026-11-16"],
  ["Sreymom Ouk", false, 2, "We are abroad, sending love", "2026-11-15"],
  ["ទេព ម៉ានិត", true, 2, "", "2026-11-15"],
  ["Chenda Sok", true, 1, "", "2026-11-15"],
  ["យឹម បូរ៉ា", true, 4, "ជូនពរឲ្យមានកូនឆាប់ៗ", "2026-11-14"],
  ["Visal Heng", true, 2, "", "2026-11-14"],
  ["ស៊ិន សុធា", true, 1, "", "2026-11-13"],
  ["Leakhena Chhay", true, 2, "Can not wait!", "2026-11-13"],
  ["នួន សំណាង", false, 1, "", "2026-11-12"],
  ["Rithy Prak", true, 3, "", "2026-11-12"],
];

export const rsvps: Rsvp[] = rsvpRows.map(([guestName, attending, partySize, message, createdAt], i) => ({
  id: `rsvp_${i + 1}`,
  invitationId: sampleInvitation.id,
  guestName,
  attending,
  partySize,
  message: message || null,
  createdAt,
}));

/** "Opened" count for the landing page demo. */
export const sampleViewCount = 186;

export function getRsvpStats(list: Rsvp[]) {
  const attending = list.filter((r) => r.attending);
  return {
    attending: attending.length,
    notAttending: list.length - attending.length,
    totalGuests: attending.reduce((sum, r) => sum + r.partySize, 0),
  };
}

export function getTemplate(id: string) {
  return templates.find((tpl) => tpl.id === id);
}
