import { PLANS } from "@/lib/mock-data";
import { COMPANY } from "@/lib/company";
import { formatPrice, toKhmerNumerals } from "@/lib/khmer";
import type { LegalDoc } from "@/modules/legal/components/LegalPage";

/* ─── Shared page chrome ─────────────────────────────────────────────── */

const uiEn = {
  updated: "Last updated:",
  langHint: "use the KH/EN button above to switch language",
  contactTitle: "Contact us",
  contactBody: {
    privacy: "Questions or requests about your privacy or your data:",
    terms: "Questions about these terms:",
  },
  read: { privacy: "Read the Privacy Policy", terms: "Read the Terms of Service" },
  home: "Back to TheabKa",
};

const uiKm: typeof uiEn = {
  updated: "កែប្រែចុងក្រោយ៖",
  langHint: "ចុចប៊ូតុង KH/EN ខាងលើ ដើម្បីប្ដូរភាសា",
  contactTitle: "ទាក់ទងយើង",
  contactBody: {
    privacy: "សម្រាប់សំណួរ ឬសំណើអំពីឯកជនភាព ឬទិន្នន័យរបស់អ្នក៖",
    terms: "សម្រាប់សំណួរអំពីលក្ខខណ្ឌទាំងនេះ៖",
  },
  read: { privacy: "អានគោលការណ៍ឯកជនភាព", terms: "អានលក្ខខណ្ឌប្រើប្រាស់" },
  home: "ត្រឡប់ទៅ TheabKa",
};

export const legalUi = { km: uiKm, en: uiEn };

/* ─── Privacy Policy ─────────────────────────────────────────────────── */

const GOOGLE_POLICY = "https://developers.google.com/terms/api-services-user-data-policy";

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  intro: `This policy explains what information TheabKa ("we") collects when you use our service, how we use it, and the choices you have. TheabKa is run by ${COMPANY.name}, ${COMPANY.cityEn}, Cambodia.`,
  sections: [
    {
      heading: "Information we collect",
      body: [
        "From hosts (people who create invitations):",
        {
          list: [
            "Your email address, used to sign you in.",
            "If you sign in with Google: your name, email address and Google account ID. We don't receive your Google password, contacts, files or any other Google data.",
            "Your language choice (Khmer or English).",
            "The invitation content you enter: the names of the bride, groom and their parents, the event date, time and schedule, the venue name, address and map location, photos, music you upload, and your gift KHQR image and note.",
            "Payment records: the plan, amount, currency, payment reference and status. You pay by scanning a KHQR code in your own banking app, so we never receive your bank login, card number or account balance.",
          ],
        },
        "From guests (people who open an invitation):",
        {
          list: [
            "If you reply to an invitation: your name, whether you will attend, how many people are coming, and any message you write.",
            "We count how many times an invitation is opened, but we don't record who opened it.",
          ],
        },
        "We don't use advertising or analytics trackers. We use one cookie to keep hosts signed in, and your browser stores your language choice.",
      ],
    },
    {
      heading: "Google sign-in",
      body: [
        "When you choose Continue with Google, Google shares your name, email address and Google account ID with us. We use them only to create your account, sign you in and show your name in the app.",
        "We don't use Google user data for advertising, we don't sell it, and we don't share it with anyone except the service providers listed below that run the app. No person reads it, except to fix a problem you ask us about, for security, or where the law requires it.",
        {
          text: "TheabKa's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
          link: { label: "Google API Services User Data Policy", href: GOOGLE_POLICY },
        },
      ],
    },
    {
      heading: "How we use information",
      body: [
        {
          list: [
            "To sign you in and keep your account secure.",
            "To build, show and host your invitation at its link.",
            "To show you your guests' replies and how many times your invitation was opened.",
            "To process payments and publish your invitation.",
            "To send sign-in codes and important messages about your account or payments.",
            "To prevent abuse and fix problems.",
          ],
        },
        "We don't sell personal information, and we don't use it for advertising.",
      ],
    },
    {
      heading: "Who can see your information",
      body: [
        {
          list: [
            "A published invitation is public: anyone with its link can see everything on it, including photos, the venue and the gift KHQR. Only add what you are happy for your guests to see and share.",
            "Draft invitations are visible only to you.",
            "Guest replies are visible only to the host of that invitation and to us.",
            "The service providers that run the app for us (below).",
          ],
        },
      ],
    },
    {
      heading: "Service providers",
      body: [
        "We use these providers to run TheabKa. They process data only on our instructions:",
        {
          list: [
            "Supabase: database, file storage and sign-in.",
            "Google: sign-in with Google.",
            "Our email provider: sending sign-in codes.",
            "Our hosting provider: serving the website.",
            "Bakong (National Bank of Cambodia): processing KHQR payments.",
          ],
        },
        "Some of these providers store data on servers outside Cambodia. We may also disclose information when the law of the Kingdom of Cambodia requires it.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        {
          list: [
            "We keep your account and invitations for as long as your account is open.",
            "Published invitations stay online for at least 12 months after the event date.",
            "When you ask us to delete your account, we delete your invitations, photos, music and guest replies. We keep payment records, no longer linked to your account, where accounting and tax rules require it.",
          ],
        },
      ],
    },
    {
      heading: "Your choices",
      body: [
        {
          list: [
            "You can see and change your invitation content in the editor at any time.",
            "You can ask us for a copy of your data, ask us to correct it, or ask us to delete your account. Email us from your account's email address.",
            "Guests who want their reply removed can ask the host, or email us with the invitation link.",
          ],
        },
      ],
    },
    {
      heading: "Security",
      body: [
        "We use encrypted connections (HTTPS) and access rules in our database, so each host can see only their own invitations and guest replies. No system is perfectly secure, so please keep your email account safe.",
      ],
    },
    {
      heading: "Children",
      body: [
        "TheabKa is for adults planning their own events. You must be 18 or older to create an account. We don't knowingly collect information from children under 13.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "If we change this policy, we will update the date at the top. If a change is significant, we will tell hosts by email or in the app.",
      ],
    },
  ],
};

const privacyKm: LegalDoc = {
  title: "គោលការណ៍ឯកជនភាព",
  intro: `គោលការណ៍នេះពន្យល់អំពីព័ត៌មានដែល TheabKa («យើង») ប្រមូល នៅពេលអ្នកប្រើសេវាកម្មរបស់យើង របៀបដែលយើងប្រើព័ត៌មាននោះ និងជម្រើសដែលអ្នកមាន។ TheabKa ដំណើរការដោយ ${COMPANY.name} ${COMPANY.cityKm} ប្រទេសកម្ពុជា។`,
  sections: [
    {
      heading: "ព័ត៌មានដែលយើងប្រមូល",
      body: [
        "ពីម្ចាស់កម្មវិធី (អ្នកបង្កើតធៀបការ)៖",
        {
          list: [
            "អាសយដ្ឋានអ៊ីមែលរបស់អ្នក សម្រាប់ចូលគណនី។",
            "ប្រសិនបើអ្នកចូលគណនីតាម Google៖ ឈ្មោះ អាសយដ្ឋានអ៊ីមែល និងលេខសម្គាល់គណនី Google របស់អ្នក។ យើងមិនទទួលបានពាក្យសម្ងាត់ Google បញ្ជីទំនាក់ទំនង ឯកសារ ឬទិន្នន័យ Google ផ្សេងទៀតរបស់អ្នកទេ។",
            "ភាសាដែលអ្នកជ្រើសរើស (ខ្មែរ ឬអង់គ្លេស)។",
            "ខ្លឹមសារធៀបការដែលអ្នកបញ្ចូល៖ ឈ្មោះកូនកំលោះ កូនក្រមុំ និងមាតាបិតា កាលបរិច្ឆេទ ម៉ោង និងកម្មវិធី ឈ្មោះទីកន្លែង អាសយដ្ឋាន និងទីតាំងលើផែនទី រូបថត តន្ត្រីដែលអ្នកបង្ហោះ និងរូប KHQR ព្រមទាំងកំណត់ចំណាំសម្រាប់ចំណងដៃ។",
            "កំណត់ត្រាការបង់ប្រាក់៖ កញ្ចប់ ចំនួនទឹកប្រាក់ រូបិយប័ណ្ណ លេខយោង និងស្ថានភាពនៃការបង់ប្រាក់។ អ្នកបង់ប្រាក់ដោយស្កេន KHQR ក្នុងកម្មវិធីធនាគាររបស់អ្នកផ្ទាល់ ដូច្នេះយើងមិនដែលទទួលបានព័ត៌មានចូលគណនីធនាគារ លេខកាត ឬសមតុល្យគណនីរបស់អ្នកទេ។",
          ],
        },
        "ពីភ្ញៀវ (អ្នកបើកមើលធៀបការ)៖",
        {
          list: [
            "ប្រសិនបើអ្នកឆ្លើយតបធៀបការ៖ ឈ្មោះរបស់អ្នក ថាតើអ្នកនឹងចូលរួមឬអត់ ចំនួនអ្នកដែលមកជាមួយ និងសារដែលអ្នកសរសេរ។",
            "យើងរាប់ចំនួនដងដែលធៀបការត្រូវបានបើក ប៉ុន្តែមិនកត់ត្រាថាអ្នកណាជាអ្នកបើកទេ។",
          ],
        },
        "យើងមិនប្រើកម្មវិធីតាមដានសម្រាប់ការផ្សាយពាណិជ្ជកម្ម ឬការវិភាគទេ។ យើងប្រើខូគី (cookie) មួយ ដើម្បីរក្សាការចូលគណនីរបស់ម្ចាស់កម្មវិធី ហើយកម្មវិធីរុករករបស់អ្នករក្សាទុកភាសាដែលអ្នកជ្រើសរើស។",
      ],
    },
    {
      heading: "ការចូលគណនីតាម Google",
      body: [
        "នៅពេលអ្នកជ្រើសរើស «បន្តជាមួយ Google» Google ចែករំលែកឈ្មោះ អាសយដ្ឋានអ៊ីមែល និងលេខសម្គាល់គណនី Google របស់អ្នកមកយើង។ យើងប្រើព័ត៌មាននេះតែដើម្បីបង្កើតគណនី ចូលគណនី និងបង្ហាញឈ្មោះរបស់អ្នកក្នុងកម្មវិធីប៉ុណ្ណោះ។",
        "យើងមិនប្រើទិន្នន័យអ្នកប្រើប្រាស់ Google សម្រាប់ការផ្សាយពាណិជ្ជកម្ម មិនលក់ និងមិនចែករំលែកវាជាមួយអ្នកណាឡើយ លើកលែងតែអ្នកផ្ដល់សេវាដែលដំណើរការកម្មវិធីនេះ ដូចមានរាយខាងក្រោម។ គ្មាននរណាម្នាក់អានទិន្នន័យនេះទេ លើកលែងតែដើម្បីដោះស្រាយបញ្ហាដែលអ្នកស្នើសុំ ដើម្បីសុវត្ថិភាព ឬតាមការតម្រូវរបស់ច្បាប់។",
        {
          text: "ការប្រើប្រាស់ និងការផ្ទេរព័ត៌មានដែល TheabKa ទទួលបានពី Google APIs គោរពតាមគោលការណ៍ទិន្នន័យអ្នកប្រើប្រាស់នៃសេវា Google API រួមទាំងតម្រូវការប្រើប្រាស់មានកំណត់ (Limited Use)។",
          link: { label: "Google API Services User Data Policy", href: GOOGLE_POLICY },
        },
      ],
    },
    {
      heading: "របៀបដែលយើងប្រើព័ត៌មាន",
      body: [
        {
          list: [
            "ដើម្បីឱ្យអ្នកចូលគណនី និងរក្សាសុវត្ថិភាពគណនីរបស់អ្នក។",
            "ដើម្បីបង្កើត បង្ហាញ និងផ្ទុកធៀបការរបស់អ្នកនៅតំណរបស់វា។",
            "ដើម្បីបង្ហាញការឆ្លើយតបរបស់ភ្ញៀវ និងចំនួនដងដែលធៀបការរបស់អ្នកត្រូវបានបើក។",
            "ដើម្បីដំណើរការការបង់ប្រាក់ និងផ្សព្វផ្សាយធៀបការរបស់អ្នក។",
            "ដើម្បីផ្ញើលេខកូដចូលគណនី និងសារសំខាន់ៗអំពីគណនី ឬការបង់ប្រាក់របស់អ្នក។",
            "ដើម្បីការពារការរំលោភបំពាន និងដោះស្រាយបញ្ហា។",
          ],
        },
        "យើងមិនលក់ព័ត៌មានផ្ទាល់ខ្លួន ហើយមិនប្រើវាសម្រាប់ការផ្សាយពាណិជ្ជកម្មទេ។",
      ],
    },
    {
      heading: "អ្នកណាអាចមើលឃើញព័ត៌មានរបស់អ្នក",
      body: [
        {
          list: [
            "ធៀបការដែលបានផ្សព្វផ្សាយគឺជាសាធារណៈ៖ អ្នកណាដែលមានតំណ អាចមើលឃើញអ្វីៗទាំងអស់នៅលើវា រួមទាំងរូបថត ទីកន្លែង និងរូប KHQR ចំណងដៃ។ សូមបញ្ចូលតែព័ត៌មានដែលអ្នកពេញចិត្តឱ្យភ្ញៀវមើល និងចែករំលែកប៉ុណ្ណោះ។",
            "ធៀបការព្រាង មានតែអ្នកទេដែលអាចមើលឃើញ។",
            "ការឆ្លើយតបរបស់ភ្ញៀវ មានតែម្ចាស់ធៀបការនោះ និងយើងប៉ុណ្ណោះដែលអាចមើលឃើញ។",
            "អ្នកផ្ដល់សេវាដែលដំណើរការកម្មវិធីឱ្យយើង (ខាងក្រោម)។",
          ],
        },
      ],
    },
    {
      heading: "អ្នកផ្ដល់សេវា",
      body: [
        "យើងប្រើអ្នកផ្ដល់សេវាទាំងនេះ ដើម្បីដំណើរការ TheabKa។ ពួកគេដំណើរការទិន្នន័យតាមការណែនាំរបស់យើងតែប៉ុណ្ណោះ៖",
        {
          list: [
            "Supabase៖ មូលដ្ឋានទិន្នន័យ ការផ្ទុកឯកសារ និងការចូលគណនី។",
            "Google៖ ការចូលគណនីតាម Google។",
            "អ្នកផ្ដល់សេវាអ៊ីមែលរបស់យើង៖ ការផ្ញើលេខកូដចូលគណនី។",
            "អ្នកផ្ដល់សេវាបង្ហោះគេហទំព័ររបស់យើង៖ ការដំណើរការគេហទំព័រ។",
            "បាគង (ធនាគារជាតិនៃកម្ពុជា)៖ ការដំណើរការការបង់ប្រាក់ KHQR។",
          ],
        },
        "អ្នកផ្ដល់សេវាខ្លះរក្សាទុកទិន្នន័យនៅលើម៉ាស៊ីនមេនៅក្រៅប្រទេសកម្ពុជា។ យើងក៏អាចបង្ហាញព័ត៌មាន នៅពេលច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជាតម្រូវ។",
      ],
    },
    {
      heading: "រយៈពេលរក្សាទុក",
      body: [
        {
          list: [
            "យើងរក្សាទុកគណនី និងធៀបការរបស់អ្នក ដរាបណាគណនីរបស់អ្នកនៅបើក។",
            `ធៀបការដែលបានផ្សព្វផ្សាយ នៅលើបណ្ដាញយ៉ាងហោចណាស់ ${toKhmerNumerals(12)} ខែ បន្ទាប់ពីថ្ងៃកម្មវិធី។`,
            "នៅពេលអ្នកស្នើឱ្យលុបគណនី យើងលុបធៀបការ រូបថត តន្ត្រី និងការឆ្លើយតបរបស់ភ្ញៀវ។ យើងរក្សាទុកកំណត់ត្រាការបង់ប្រាក់ ដោយលែងភ្ជាប់ជាមួយគណនីរបស់អ្នក តាមតម្រូវការគណនេយ្យ និងពន្ធដារ។",
          ],
        },
      ],
    },
    {
      heading: "ជម្រើសរបស់អ្នក",
      body: [
        {
          list: [
            "អ្នកអាចមើល និងកែប្រែខ្លឹមសារធៀបការរបស់អ្នក ក្នុងផ្ទាំងកែសម្រួលបានគ្រប់ពេល។",
            "អ្នកអាចស្នើសុំច្បាប់ចម្លងទិន្នន័យរបស់អ្នក ស្នើឱ្យកែតម្រូវ ឬស្នើឱ្យលុបគណនីរបស់អ្នក។ សូមផ្ញើអ៊ីមែលមកយើង ពីអាសយដ្ឋានអ៊ីមែលនៃគណនីរបស់អ្នក។",
            "ភ្ញៀវដែលចង់លុបការឆ្លើយតបរបស់ខ្លួន អាចស្នើទៅម្ចាស់ធៀបការ ឬផ្ញើអ៊ីមែលមកយើង ជាមួយតំណធៀបការនោះ។",
          ],
        },
      ],
    },
    {
      heading: "សុវត្ថិភាព",
      body: [
        "យើងប្រើការតភ្ជាប់ដែលបានអ៊ិនគ្រីប (HTTPS) និងច្បាប់កំណត់សិទ្ធិក្នុងមូលដ្ឋានទិន្នន័យ ដើម្បីឱ្យម្ចាស់កម្មវិធីម្នាក់ៗមើលឃើញតែធៀបការ និងការឆ្លើយតបរបស់ភ្ញៀវរបស់ខ្លួនប៉ុណ្ណោះ។ គ្មានប្រព័ន្ធណាមានសុវត្ថិភាពទាំងស្រុងនោះទេ ដូច្នេះសូមរក្សាសុវត្ថិភាពគណនីអ៊ីមែលរបស់អ្នក។",
      ],
    },
    {
      heading: "កុមារ",
      body: [
        `TheabKa សម្រាប់មនុស្សពេញវ័យដែលរៀបចំកម្មវិធីផ្ទាល់ខ្លួន។ អ្នកត្រូវមានអាយុយ៉ាងហោចណាស់ ${toKhmerNumerals(18)} ឆ្នាំ ដើម្បីបង្កើតគណនី។ យើងមិនប្រមូលព័ត៌មានពីកុមារអាយុក្រោម ${toKhmerNumerals(13)} ឆ្នាំដោយចេតនាទេ។`,
      ],
    },
    {
      heading: "ការផ្លាស់ប្ដូរគោលការណ៍នេះ",
      body: [
        "ប្រសិនបើយើងផ្លាស់ប្ដូរគោលការណ៍នេះ យើងនឹងកែកាលបរិច្ឆេទនៅខាងលើ។ ប្រសិនបើការផ្លាស់ប្ដូរនោះសំខាន់ យើងនឹងជូនដំណឹងដល់ម្ចាស់កម្មវិធីតាមអ៊ីមែល ឬក្នុងកម្មវិធី។",
      ],
    },
  ],
};

export const privacyContent = { km: privacyKm, en: privacyEn };

/* ─── Terms of Service ───────────────────────────────────────────────── */

const basicEn = formatPrice(PLANS.basic.priceUsd, "en");
const premiumEn = formatPrice(PLANS.premium.priceUsd, "en");
const basicKm = formatPrice(PLANS.basic.priceUsd, "km");
const premiumKm = formatPrice(PLANS.premium.priceUsd, "km");

const termsEn: LegalDoc = {
  title: "Terms of Service",
  intro: `These terms apply when you use TheabKa, run by ${COMPANY.name}. By creating an account or publishing an invitation, you agree to them.`,
  sections: [
    {
      heading: "Your account",
      body: [
        {
          list: [
            "You must be 18 or older.",
            "Use a real email address that you control. You are responsible for what happens in your account, so keep your email account secure.",
            "One account can create many invitations.",
          ],
        },
      ],
    },
    {
      heading: "Prices and payment",
      body: [
        "Building, previewing and editing an invitation is free. You pay once per invitation, when you publish it:",
        {
          list: [
            `Basic: ${basicEn.usd} (${basicEn.riel}), up to ${PLANS.basic.maxPhotos} photos.`,
            `Premium: ${premiumEn.usd} (${premiumEn.riel}), up to ${PLANS.premium.maxPhotos} photos and your own music.`,
          ],
        },
        "You pay by KHQR. The invitation is published when the payment is confirmed. Editing after you publish is free. A payment covers one invitation only and can't be moved to another invitation.",
      ],
    },
    {
      heading: "Refunds",
      body: [
        "If you paid but your invitation was not published because of a problem on our side, contact us within 30 days and we will fix it or refund you. Once an invitation is published, payments are not refundable, except where the law requires it.",
      ],
    },
    {
      heading: "Your content",
      body: [
        {
          list: [
            "You keep ownership of the photos, music, names and text you add.",
            "You allow us to store, copy and show that content only to run your invitation and the service.",
            "Only upload content you have the right to use. Don't upload someone else's music or photos without their permission.",
            "Don't use TheabKa for anything illegal, misleading, hateful or sexual, or to collect other people's information without their consent.",
          ],
        },
        "We may remove content or take an invitation offline if it breaks these terms or the law.",
      ],
    },
    {
      heading: "Gifts",
      body: [
        "The gift section shows the KHQR image you upload. Guests send money straight to your bank account. TheabKa never receives, holds or transfers gift money and is not responsible for those payments. Check that your KHQR image is correct.",
      ],
    },
    {
      heading: "Guest information",
      body: ["Guest replies are for your event only. Don't sell them or use them to send spam."],
    },
    {
      heading: "Availability",
      body: [
        "We work to keep TheabKa running, but it may sometimes be unavailable for maintenance or because of problems outside our control. A published invitation stays online for at least 12 months after the event date, unless you ask us to remove it or it breaks these terms.",
      ],
    },
    {
      heading: "Closing your account",
      body: [
        "You can stop using TheabKa and ask us to delete your account at any time. We may suspend accounts that break these terms.",
      ],
    },
    {
      heading: "Limitation of liability",
      body: [
        "TheabKa is provided as it is. As far as the law allows, we are not responsible for indirect losses, and our total responsibility to you for an invitation is limited to the amount you paid for it.",
      ],
    },
    {
      heading: "Governing law",
      body: ["These terms are governed by the laws of the Kingdom of Cambodia."],
    },
    {
      heading: "Changes to these terms",
      body: [
        "We may update these terms. We will update the date at the top and tell hosts about significant changes by email or in the app.",
      ],
    },
  ],
};

const termsKm: LegalDoc = {
  title: "លក្ខខណ្ឌប្រើប្រាស់",
  intro: `លក្ខខណ្ឌទាំងនេះអនុវត្ត នៅពេលអ្នកប្រើ TheabKa ដែលដំណើរការដោយ ${COMPANY.name}។ ដោយបង្កើតគណនី ឬផ្សព្វផ្សាយធៀបការ អ្នកយល់ព្រមតាមលក្ខខណ្ឌទាំងនេះ។`,
  sections: [
    {
      heading: "គណនីរបស់អ្នក",
      body: [
        {
          list: [
            `អ្នកត្រូវមានអាយុយ៉ាងហោចណាស់ ${toKhmerNumerals(18)} ឆ្នាំ។`,
            "សូមប្រើអាសយដ្ឋានអ៊ីមែលពិត ដែលអ្នកគ្រប់គ្រង។ អ្នកទទួលខុសត្រូវចំពោះសកម្មភាពក្នុងគណនីរបស់អ្នក ដូច្នេះសូមរក្សាសុវត្ថិភាពគណនីអ៊ីមែលរបស់អ្នក។",
            "គណនីមួយអាចបង្កើតធៀបការបានច្រើន។",
          ],
        },
      ],
    },
    {
      heading: "តម្លៃ និងការបង់ប្រាក់",
      body: [
        "ការបង្កើត ការមើលជាមុន និងការកែសម្រួលធៀបការ គឺឥតគិតថ្លៃ។ អ្នកបង់ប្រាក់តែម្ដងសម្រាប់ធៀបការនីមួយៗ នៅពេលផ្សព្វផ្សាយ៖",
        {
          list: [
            `មូលដ្ឋាន៖ ${basicKm.usd} (${basicKm.riel}) រូបថតរហូតដល់ ${toKhmerNumerals(PLANS.basic.maxPhotos)} សន្លឹក។`,
            `ពិសេស៖ ${premiumKm.usd} (${premiumKm.riel}) រូបថតរហូតដល់ ${toKhmerNumerals(PLANS.premium.maxPhotos)} សន្លឹក និងតន្ត្រីផ្ទាល់ខ្លួន។`,
          ],
        },
        "អ្នកបង់ប្រាក់តាម KHQR។ ធៀបការនឹងត្រូវផ្សព្វផ្សាយ នៅពេលការបង់ប្រាក់ត្រូវបានបញ្ជាក់។ ការកែសម្រួលក្រោយផ្សព្វផ្សាយ ឥតគិតថ្លៃ។ ការបង់ប្រាក់មួយដង សម្រាប់ធៀបការតែមួយប៉ុណ្ណោះ ហើយមិនអាចផ្ទេរទៅធៀបការផ្សេងបានទេ។",
      ],
    },
    {
      heading: "ការសងប្រាក់វិញ",
      body: [
        `ប្រសិនបើអ្នកបានបង់ប្រាក់ ប៉ុន្តែធៀបការមិនបានផ្សព្វផ្សាយ ដោយសារបញ្ហាពីខាងយើង សូមទាក់ទងយើងក្នុងរយៈពេល ${toKhmerNumerals(30)} ថ្ងៃ យើងនឹងដោះស្រាយ ឬសងប្រាក់ជូនអ្នកវិញ។ នៅពេលធៀបការបានផ្សព្វផ្សាយហើយ ការបង់ប្រាក់មិនអាចសងវិញបានទេ លើកលែងតែច្បាប់តម្រូវ។`,
      ],
    },
    {
      heading: "ខ្លឹមសាររបស់អ្នក",
      body: [
        {
          list: [
            "អ្នកនៅតែជាម្ចាស់រូបថត តន្ត្រី ឈ្មោះ និងអត្ថបទដែលអ្នកបញ្ចូល។",
            "អ្នកអនុញ្ញាតឱ្យយើងរក្សាទុក ចម្លង និងបង្ហាញខ្លឹមសារនោះ តែដើម្បីដំណើរការធៀបការរបស់អ្នក និងសេវាកម្មនេះប៉ុណ្ណោះ។",
            "សូមបង្ហោះតែខ្លឹមសារដែលអ្នកមានសិទ្ធិប្រើ។ កុំបង្ហោះតន្ត្រី ឬរូបថតរបស់អ្នកដទៃ ដោយគ្មានការអនុញ្ញាតពីពួកគេ។",
            "កុំប្រើ TheabKa សម្រាប់អ្វីដែលខុសច្បាប់ បំភាន់ ញុះញង់ឱ្យស្អប់ ឬអាសអាភាស ឬដើម្បីប្រមូលព័ត៌មានអ្នកដទៃ ដោយគ្មានការយល់ព្រម។",
          ],
        },
        "យើងអាចលុបខ្លឹមសារ ឬបិទធៀបការ ប្រសិនបើវាបំពានលក្ខខណ្ឌទាំងនេះ ឬច្បាប់។",
      ],
    },
    {
      heading: "ចំណងដៃ",
      body: [
        "ផ្នែកចំណងដៃបង្ហាញរូប KHQR ដែលអ្នកបង្ហោះ។ ភ្ញៀវផ្ញើប្រាក់ចូលគណនីធនាគាររបស់អ្នកដោយផ្ទាល់។ TheabKa មិនដែលទទួល រក្សាទុក ឬផ្ទេរប្រាក់ចំណងដៃទេ ហើយមិនទទួលខុសត្រូវចំពោះការទូទាត់ទាំងនោះឡើយ។ សូមពិនិត្យថារូប KHQR របស់អ្នកត្រឹមត្រូវ។",
      ],
    },
    {
      heading: "ព័ត៌មានភ្ញៀវ",
      body: ["ការឆ្លើយតបរបស់ភ្ញៀវ គឺសម្រាប់កម្មវិធីរបស់អ្នកតែប៉ុណ្ណោះ។ កុំលក់ ឬប្រើវាដើម្បីផ្ញើសាររំខាន (spam)។"],
    },
    {
      heading: "ភាពអាចប្រើបាននៃសេវាកម្ម",
      body: [
        `យើងខិតខំរក្សាឱ្យ TheabKa ដំណើរការជានិច្ច ប៉ុន្តែពេលខ្លះវាអាចមិនដំណើរការ ដោយសារការថែទាំ ឬបញ្ហាក្រៅពីការគ្រប់គ្រងរបស់យើង។ ធៀបការដែលបានផ្សព្វផ្សាយ នៅលើបណ្ដាញយ៉ាងហោចណាស់ ${toKhmerNumerals(12)} ខែ បន្ទាប់ពីថ្ងៃកម្មវិធី លើកលែងតែអ្នកស្នើឱ្យដកចេញ ឬវាបំពានលក្ខខណ្ឌទាំងនេះ។`,
      ],
    },
    {
      heading: "ការបិទគណនី",
      body: [
        "អ្នកអាចឈប់ប្រើ TheabKa និងស្នើឱ្យលុបគណនីរបស់អ្នកបានគ្រប់ពេល។ យើងអាចផ្អាកគណនីដែលបំពានលក្ខខណ្ឌទាំងនេះ។",
      ],
    },
    {
      heading: "ការកំណត់ការទទួលខុសត្រូវ",
      body: [
        "TheabKa ត្រូវបានផ្ដល់ជូនតាមស្ថានភាពដែលវាមាន។ ក្នុងកម្រិតដែលច្បាប់អនុញ្ញាត យើងមិនទទួលខុសត្រូវចំពោះការខូចខាតដោយប្រយោលទេ ហើយការទទួលខុសត្រូវសរុបរបស់យើងចំពោះធៀបការនីមួយៗ មិនលើសពីចំនួនទឹកប្រាក់ដែលអ្នកបានបង់សម្រាប់ធៀបការនោះឡើយ។",
      ],
    },
    {
      heading: "ច្បាប់គ្រប់គ្រង",
      body: ["លក្ខខណ្ឌទាំងនេះស្ថិតក្រោមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។"],
    },
    {
      heading: "ការផ្លាស់ប្ដូរលក្ខខណ្ឌ",
      body: [
        "យើងអាចធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌទាំងនេះ។ យើងនឹងកែកាលបរិច្ឆេទនៅខាងលើ ហើយជូនដំណឹងដល់ម្ចាស់កម្មវិធីអំពីការផ្លាស់ប្ដូរសំខាន់ៗ តាមអ៊ីមែល ឬក្នុងកម្មវិធី។",
      ],
    },
  ],
};

export const termsContent = { km: termsKm, en: termsEn };
