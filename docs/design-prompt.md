# TheabKa: prompt for a UI mockup and prototype

Copy everything inside the box below and paste it into a design or prototyping AI tool, such as v0, Lovable, Bolt, Figma Make, Google Stitch or Claude. It's written so the tool builds a clickable prototype with sample data. To get only static mockups, change the first line to "Design high-fidelity mobile mockups".

---

```text
Build a clickable, mobile-first web prototype for "TheabKa", a Cambodian digital invitation app. Hosts make a wedding or engagement invitation in Khmer and English, share one link, and collect RSVPs. Guests open the link in a phone browser, with no app and no account. Hosts pay once per invitation by KHQR when they publish. Use realistic sample data and make every button and link go somewhere.

## 1. Product summary
- Users: (a) Host, a couple or family planning a wedding or engagement in Cambodia. (b) Guest, who opens the link from Telegram or Facebook Messenger on a phone.
- Core loop: pick a template, edit details, preview, pay by KHQR, share the link, guests RSVP, host watches the RSVP list.
- Pricing: Basic $5 (20,000 ៛) and Premium $15 (60,000 ៛), paid once per invitation. Building and previewing are free.
- Languages: Khmer first, with English beside it. A KH/EN toggle in the header switches the app interface. The invitation itself always shows both languages.

## 2. Style direction
- Look: a modern Cambodian wedding. Warm and elegant, not cluttered.
- Colours: deep maroon #7A1F2B (primary), gold #C9A24B (accent), ivory #FBF6EE (background), charcoal #2B2B2B (text), soft jade #5E8C7A (success/RSVP yes).
- Ornaments: thin gold Khmer kbach-style corner borders and dividers, lotus and jasmine motifs, used lightly on invitation pages only. Keep the host app clean and plain.
- Type: Khmer headings in "Moul" (decorative titles only) and "Kantumruy Pro" (UI and body). English in "Playfair Display" (invitation titles) and "Inter" (UI). Make Khmer line height at least 1.6 so stacked vowels and subscripts don't clip.
- Mobile-first at 390 px wide. Make a desktop version for the landing page and dashboard only. Tap targets at least 44 px. Rounded corners 12 px. Soft shadows on cards only.
- Use Khmer numerals and Khmer calendar dates on invitations (e.g. ថ្ងៃអាទិត្យ ទី១៥ ខែធ្នូ ឆ្នាំ២០២៦), with the Western date in smaller English text under them.

## 3. Screens (9) and flow

Host flow: 1 → 2 → 3 → 4 → 5 → 6. Guest flow: 7 → 8, and 7 → 9.

1. Landing page: hero with a phone mock showing a sample invitation, "Create your invitation" button, 3-step how-it-works strip, template gallery preview, pricing cards (USD and riel), FAQ, footer with company name, contact and Telegram.
2. Sign in: phone number field with +855 prefix, "Send code" button, 6-digit OTP input, "Continue with Google" option.
3. Pick a template: filter chips (Wedding, Engagement), a grid of 8 template cards each with a thumbnail, name, Basic/Premium badge and price. Tapping a card opens a full-screen live preview with "Use this template".
4. Edit invitation: a step form with a sticky preview button and an autosave indicator. Sections:
   a. Couple: bride and groom names (Khmer + English), parents' names.
   b. Date and time: date picker that shows the Khmer date automatically, ceremony start time.
   c. Venue: venue name, address, map pin picker (Google Maps), "Get directions" link.
   d. Schedule: an editable list of events (time + title in Khmer/English), e.g. hair-cutting ceremony, monk blessing, reception.
   e. Photos: upload up to 6 (Premium) or 3 (Basic), drag to reorder, pick a cover photo.
   f. Music: pick from 5 built-in tracks or upload one (Premium only), with a mute toggle.
   g. Gift: upload the host's own KHQR image, with an optional note.
5. Preview and pay: full phone preview, plan summary, price in USD and riel, "Pay with KHQR" button that opens a sheet with a KHQR code, amount, a countdown timer and "Waiting for payment…". Then a success state ("Your invitation is live!") with the link and share buttons.
6. Host dashboard: a list of the host's invitations (cards with status: Draft / Live). Inside one invitation: share link with Copy, Telegram, Messenger and QR download buttons; stat tiles (Opened, Attending, Not attending, Total guests); RSVP table (name, yes/no, number of people, message, date) with search, filter and CSV export; "Edit invitation" button (editing after publishing is free).
7. Invitation page (guest): an opening animation (envelope or doors opening, tap to open, music starts), cover photo, couple names in Khmer + English, Khmer date, parents' names, schedule timeline, photo gallery, venue card with a map and "Get directions", "Add to calendar" button, sticky bottom bar with "RSVP" and "Gift" buttons.
8. RSVP form (bottom sheet): name, attending yes/no (big buttons), number of people stepper (1–10), optional message, submit. Then a thank-you state with a confetti or lotus animation.
9. Gift (bottom sheet): the host's KHQR image large and centred, "Save image" button, short note "Scan with ABA, ACLEDA, Wing or any KHQR app". The app never handles this money.

Also design these states: empty dashboard, loading skeletons, upload error, payment expired, invitation not found (404), and a link-preview card (Open Graph image 1200×630 with the couple's names and date) as it looks inside Telegram.

## 4. Main components
Header with language toggle · Primary/secondary buttons · Template card · Step form section · Khmer date display · Photo uploader · Music picker · Map card · Schedule timeline item · Price card · KHQR payment sheet · Stat tile · RSVP table row · Share bar · Bottom sheet · Toast · Status badge (Draft/Live/Paid) · Empty state.

## 5. Data model
- User: id, phone, google_id?, name, language (km/en), created_at
- Template: id, name_km, name_en, event_type (wedding/engagement), tier (basic/premium), price_usd, thumbnail_url, theme (colours, fonts, ornament set)
- Invitation: id, user_id, template_id, slug (public link), status (draft/live), bride_km, bride_en, groom_km, groom_en, parents (json), event_date, start_time, venue_name, venue_address, lat, lng, schedule (json list), cover_photo_id, music_url?, music_muted_default, gift_qr_url?, gift_note?, published_at, created_at, updated_at
- Photo: id, invitation_id, url, position
- RSVP: id, invitation_id, guest_name, attending (bool), party_size, message?, created_at
- Payment: id, invitation_id, user_id, plan (basic/premium), amount_usd, amount_khr, provider (aba_payway/bakong), provider_ref, status (pending/paid/expired/refunded), paid_at
- View: invitation_id, opened_at (for the "Opened" count)

## 6. Architecture and tech stack (for reference and for any generated code)
- Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui, deployed on Vercel.
- Supabase: Postgres database, Auth (phone OTP + Google), Storage for photos and music, row-level security so hosts only see their own invitations and RSVPs.
- Public invitation route /i/[slug], server-rendered for fast loading and Open Graph tags. Host app routes /app, /app/new, /app/[id]/edit, /app/[id]/dashboard.
- Payments: create a KHQR charge via ABA PayWay (or Bakong). A webhook marks the Payment paid and sets the Invitation to live.
- Fonts from Google Fonts (Moul, Kantumruy Pro, Playfair Display, Inter). Analytics with PostHog.
- In the prototype, mock the API, auth and payment with sample data. Simulate payment succeeding 3 seconds after the KHQR sheet opens.

## 7. Sample data
Couple: សុខ ដារ៉ា (Sok Dara) & ចាន់ សុភា (Chan Sophea). Date: Sunday 15 December 2026, 7:00 AM. Venue: Sokha Phnom Penh Hotel, Chroy Changvar, Phnom Penh. Schedule: 7:00 hair-cutting ceremony, 9:00 monk blessing, 11:00 tying of the knot, 17:00 wedding reception. 24 sample RSVPs with Khmer and English names, mostly "attending".

## 8. Output
A working prototype with all 9 screens and the states listed, navigation between them, both languages, and a short README listing the screens, routes and components.
```
