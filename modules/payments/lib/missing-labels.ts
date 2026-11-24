import type { MissingDetail } from "./invitation-checks";

/**
 * Wording for each missing detail, shared by the editor and the pay screen.
 * `item`: a line in a "still missing" list. `action`: a short prompt under a step name.
 */
type Labels = Record<MissingDetail, { item: string; action: string }>;

const en: Labels = {
  names: { item: "Groom's and bride's names (Khmer and English)", action: "Add both names" },
  date: { item: "Event date", action: "Add the event date" },
  time: { item: "Ceremony start time", action: "Add the start time" },
  venue: { item: "Venue name (Khmer and English)", action: "Add the venue name" },
  address: { item: "Venue address (Khmer and English)", action: "Add the address" },
  schedule: { item: "At least one program event, each with a time and titles", action: "Add program events" },
  photos: { item: "At least one photo", action: "Add a photo" },
  music: { item: "A song", action: "Choose a song" },
  gift: { item: "Your gift KHQR image", action: "Upload your KHQR" },
  giftNote: { item: "Gift note (Khmer and English)", action: "Add the gift note" },
};

const km: Labels = {
  names: { item: "ឈ្មោះកូនកំលោះ និងកូនក្រមុំ (ខ្មែរ និងអង់គ្លេស)", action: "បំពេញឈ្មោះទាំងពីរ" },
  date: { item: "កាលបរិច្ឆេទកម្មវិធី", action: "បំពេញកាលបរិច្ឆេទកម្មវិធី" },
  time: { item: "ម៉ោងចាប់ផ្ដើមពិធី", action: "បំពេញម៉ោងចាប់ផ្ដើម" },
  venue: { item: "ឈ្មោះទីកន្លែង (ខ្មែរ និងអង់គ្លេស)", action: "បំពេញឈ្មោះទីកន្លែង" },
  address: { item: "អាសយដ្ឋានទីកន្លែង (ខ្មែរ និងអង់គ្លេស)", action: "បំពេញអាសយដ្ឋាន" },
  schedule: { item: "កម្មវិធីយ៉ាងហោចណាស់មួយ ដែលមានម៉ោង និងចំណងជើង", action: "បន្ថែមកម្មវិធី" },
  photos: { item: "រូបថតយ៉ាងហោចណាស់មួយ", action: "បន្ថែមរូបថត" },
  music: { item: "បទចម្រៀង", action: "ជ្រើសរើសបទចម្រៀង" },
  gift: { item: "រូប KHQR សម្រាប់ចំណងដៃ", action: "បញ្ចូល KHQR របស់អ្នក" },
  giftNote: { item: "សារចំណងដៃ (ខ្មែរ និងអង់គ្លេស)", action: "បំពេញសារចំណងដៃ" },
};

export const missingLabels = { en, km };
