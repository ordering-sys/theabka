export type Lang = "km" | "en";

/**
 * Host-app UI strings. Add a key to `en` first; the `km` object must match
 * its shape, so a missing translation is a type error.
 */
const en = {
  brand: { name: "TheabKa", nameKm: "ធៀបការ" },
  common: {
    signIn: "Sign in",
    close: "Close",
    back: "Back",
    continue: "Continue",
    save: "Save",
    copy: "Copy",
    copied: "Copied",
    languageToggle: "Language",
  },
  status: { draft: "Draft", live: "Live", paid: "Paid" },
  tier: { basic: "Basic", premium: "Premium" },
  eventType: { wedding: "Wedding", engagement: "Engagement" },
  rsvp: { attending: "Attending", notAttending: "Not attending", people: "people" },
};

export type Dictionary = typeof en;

const km: Dictionary = {
  brand: { name: "TheabKa", nameKm: "ធៀបការ" },
  common: {
    signIn: "ចូលគណនី",
    close: "បិទ",
    back: "ត្រឡប់ក្រោយ",
    continue: "បន្ត",
    save: "រក្សាទុក",
    copy: "ចម្លង",
    copied: "បានចម្លង",
    languageToggle: "ភាសា",
  },
  status: { draft: "ព្រាង", live: "ផ្សាយហើយ", paid: "បានបង់" },
  tier: { basic: "មូលដ្ឋាន", premium: "ពិសេស" },
  eventType: { wedding: "អាពាហ៍ពិពាហ៍", engagement: "ភ្ជាប់ពាក្យ" },
  rsvp: { attending: "ចូលរួម", notAttending: "មិនចូលរួម", people: "នាក់" },
};

export const dictionaries: Record<Lang, Dictionary> = { km, en };
