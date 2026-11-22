/**
 * Hand-written to match supabase/migrations. Regenerate with
 *   npx supabase gen types typescript --linked > lib/supabase/database.types.ts
 * once the project is linked (the generated file is a drop-in replacement).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type EventType = "wedding" | "engagement";
type Tier = "basic" | "premium";
type InvitationStatus = "draft" | "live";
type PaymentStatus = "pending" | "paid" | "expired" | "refunded";
type PaymentProvider = "aba_payway" | "bakong" | "sandbox";
type PaymentCurrency = "USD" | "KHR";
type AppLanguage = "km" | "en";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type PlanRow = {
  tier: Tier;
  price_usd_cents: number;
  price_khr: number;
  max_photos: number;
  custom_music: boolean;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  google_id: string | null;
  name: string | null;
  language: AppLanguage;
  created_at: string;
  updated_at: string;
};

export type TemplateRow = {
  id: string;
  name_km: string;
  name_en: string;
  event_type: EventType;
  tier: Tier;
  thumbnail_url: string | null;
  theme: Json;
  position: number;
  active: boolean;
  created_at: string;
};

export type MusicTrackRow = {
  id: string;
  name_km: string;
  name_en: string;
  style_km: string;
  style_en: string;
  duration: string;
  url: string;
  position: number;
  active: boolean;
};

export type InvitationRow = {
  id: string;
  user_id: string;
  template_id: string;
  slug: string;
  status: InvitationStatus;
  paid_tier: Tier | null;
  bride_km: string;
  bride_en: string;
  groom_km: string;
  groom_en: string;
  parents: Json;
  event_date: string | null;
  start_time: string | null;
  venue_name_km: string;
  venue_name_en: string;
  venue_address_km: string;
  venue_address_en: string;
  lat: number | null;
  lng: number | null;
  schedule: Json;
  cover_photo_id: string | null;
  music_url: string | null;
  custom_music_ref: string | null;
  custom_music_name: string | null;
  music_muted_default: boolean;
  gift_qr_url: string | null;
  gift_note_km: string | null;
  gift_note_en: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns a host may write. status / published_at / paid_tier are server-only. */
export type InvitationWritable = Omit<
  InvitationRow,
  "id" | "user_id" | "status" | "paid_tier" | "published_at" | "created_at" | "updated_at" | "custom_music_ref" | "custom_music_name"
>;

export type PhotoRow = {
  id: string;
  invitation_id: string;
  storage_path: string;
  position: number;
  created_at: string;
};

export type RsvpRow = {
  id: string;
  invitation_id: string;
  guest_name: string;
  attending: boolean;
  party_size: number;
  message: string | null;
  created_at: string;
};

export type ViewRow = { id: number; invitation_id: string; opened_at: string };

export type PaymentRow = {
  id: string;
  invitation_id: string | null;
  user_id: string | null;
  plan: Tier;
  amount_usd_cents: number;
  amount_khr: number;
  currency: PaymentCurrency;
  provider: PaymentProvider;
  provider_ref: string;
  status: PaymentStatus;
  qr_payload: string | null;
  expires_at: string;
  paid_at: string | null;
  raw: Json | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      plans: Table<PlanRow, PlanRow>;
      profiles: Table<ProfileRow, Pick<ProfileRow, "id"> & Partial<ProfileRow>>;
      templates: Table<TemplateRow, Omit<TemplateRow, "created_at" | "position" | "active" | "theme"> & Partial<TemplateRow>>;
      music_tracks: Table<MusicTrackRow, Omit<MusicTrackRow, "position" | "active"> & Partial<MusicTrackRow>>;
      invitations: Table<InvitationRow, Pick<InvitationRow, "user_id" | "template_id"> & Partial<InvitationRow>>;
      photos: Table<PhotoRow, Pick<PhotoRow, "invitation_id" | "storage_path"> & Partial<PhotoRow>>;
      rsvps: Table<
        RsvpRow,
        Pick<RsvpRow, "invitation_id" | "guest_name" | "attending"> & Partial<Omit<RsvpRow, "created_at">>
      >;
      views: Table<ViewRow, { invitation_id: string }>;
      payments: Table<
        PaymentRow,
        Omit<PaymentRow, "id" | "status" | "paid_at" | "raw" | "qr_payload" | "created_at" | "updated_at"> &
          Partial<PaymentRow>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_published_invitation: { Args: { p_slug: string }; Returns: Json };
      mark_payment_paid: {
        Args: { p_provider_ref: string; p_amount: number; p_currency: PaymentCurrency; p_raw?: Json };
        Returns: { payment_id: string; invitation_id: string | null; slug: string | null; already_paid: boolean }[];
      };
      owns_invitation: { Args: { p_invitation_id: string }; Returns: boolean };
      is_live_invitation: { Args: { p_invitation_id: string }; Returns: boolean };
      invitation_allows_custom_music: { Args: { p_invitation_id: string }; Returns: boolean };
    };
    Enums: {
      event_type: EventType;
      tier: Tier;
      invitation_status: InvitationStatus;
      payment_status: PaymentStatus;
      payment_provider: PaymentProvider;
      payment_currency: PaymentCurrency;
      app_language: AppLanguage;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
