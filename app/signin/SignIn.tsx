"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/ui/Icons";
import { LotusMark } from "@/components/ui/Header";
import { TopBar } from "@/components/ui/TopBar";
import { useSession } from "@/components/dashboard/RequireSession";
import * as auth from "@/lib/auth/client";
import { useContent, useLanguage } from "@/lib/i18n";
import { toKhmerNumerals } from "@/lib/khmer";
import { sampleUser } from "@/lib/mock-data";
import { signInMock } from "@/lib/mock-store";
import { USE_SUPABASE, listInvitations } from "@/lib/store";

const content = {
  en: {
    title: "Sign in or create an account",
    subEmail: "We'll email you a 6-digit code. No password needed.",
    subOtp: "Enter the code we sent to",
    email: "Email address",
    emailPh: "you@example.com",
    send: "Send code",
    code: "6-digit code",
    codeHint: "Check your inbox and spam folder. The code expires in a few minutes.",
    hint: "Prototype: type any 6 digits",
    cont: "Continue",
    change: "Use a different email",
    resendIn: "Resend in",
    resend: "Resend code",
    resent: "New code sent",
    or: "or",
    google: "Continue with Google",
    demo: "Fill the sample email",
    terms: "By continuing you agree to the Terms and Privacy Policy",
    emailError: "Enter a valid email address, like name@example.com",
    wait: "Please wait…",
    errors: {
      invalid_email: "That doesn't look like a valid email address.",
      invalid_code: "That code is wrong or has expired. Check your email or send a new code.",
      rate_limited: "Too many tries. Please wait a minute and try again.",
      failed: "Something went wrong. Please try again.",
    },
  },
  km: {
    title: "ចូលគណនី ឬបង្កើតគណនីថ្មី",
    subEmail: "យើងនឹងផ្ញើលេខកូដ ៦ ខ្ទង់ទៅអ៊ីមែលរបស់អ្នក។ មិនចាំបាច់មានពាក្យសម្ងាត់ទេ។",
    subOtp: "បញ្ចូលលេខកូដដែលយើងបានផ្ញើទៅ",
    email: "អាសយដ្ឋានអ៊ីមែល",
    emailPh: "you@example.com",
    send: "ផ្ញើលេខកូដ",
    code: "លេខកូដ ៦ ខ្ទង់",
    codeHint: "សូមពិនិត្យប្រអប់សំបុត្រ និងថតសារឥតបានការ (spam)។ លេខកូដផុតកំណត់ក្នុងពីរបីនាទី។",
    hint: "គំរូសាកល្បង៖ វាយលេខ ៦ ខ្ទង់ណាមួយ",
    cont: "បន្ត",
    change: "ប្រើអ៊ីមែលផ្សេង",
    resendIn: "ផ្ញើម្ដងទៀតក្នុង",
    resend: "ផ្ញើលេខកូដម្ដងទៀត",
    resent: "បានផ្ញើលេខកូដថ្មី",
    or: "ឬ",
    google: "បន្តជាមួយ Google",
    demo: "បំពេញអ៊ីមែលគំរូ",
    terms: "ដោយបន្ត អ្នកយល់ព្រមលក្ខខណ្ឌប្រើប្រាស់ និងគោលការណ៍ឯកជនភាព",
    emailError: "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ ឧ. name@example.com",
    wait: "សូមរង់ចាំ…",
    errors: {
      invalid_email: "អាសយដ្ឋានអ៊ីមែលនេះមិនត្រឹមត្រូវទេ។",
      invalid_code: "លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមពិនិត្យអ៊ីមែល ឬផ្ញើលេខកូដថ្មី។",
      rate_limited: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំមួយនាទី ហើយព្យាយាមម្ដងទៀត។",
      failed: "មានបញ្ហាមួយ។ សូមព្យាយាមម្ដងទៀត។",
    },
  },
};

const RESEND_SECONDS = 60;

/**
 * One screen for both sign-in and registration: enter an email, get a
 * 6-digit code, type it in. The first sign-in creates the account.
 */
export function SignIn() {
  const c = useContent(content);
  const { lang } = useLanguage();
  const router = useRouter();
  const { session } = useSession();
  // Opening /signin while already signed in skips the form. Not after signing in here: verify() picks the destination.
  const signingIn = useRef(false);
  useEffect(() => {
    if (session && !signingIn.current) router.replace("/app");
  }, [session, router]);

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const address = email.trim().toLowerCase();
  const emailOk = auth.isValidEmail(address);
  const showEmailError = touched && address.length > 0 && !emailOk;
  const otpOk = otp.length >= 6; // 6 expected; up to 8 accepted (see lib/auth/client.ts)

  useEffect(() => {
    if (step !== "otp" || seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [step, seconds]);

  const countdown = (() => {
    const s = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    return lang === "km" ? toKhmerNumerals(s) : s;
  })();

  const errorText = (r: auth.AuthResult) => (r.ok ? "" : c.errors[r.error]);

  async function sendCode(resend = false) {
    setTouched(true);
    if (!emailOk || busy) return;
    setError("");
    if (USE_SUPABASE) {
      setBusy(true);
      const r = await auth.sendEmailOtp(address);
      setBusy(false);
      if (!r.ok) return setError(errorText(r));
    }
    setStep("otp");
    setOtp("");
    setSeconds(RESEND_SECONDS);
    setNotice(resend ? c.resent : "");
  }

  async function verify() {
    if (!otpOk || busy) return;
    setError("");
    signingIn.current = true;
    let userId: string;
    if (USE_SUPABASE) {
      setBusy(true);
      const r = await auth.verifyEmailOtp(address, otp);
      if (!r.ok || !r.session) {
        setBusy(false);
        signingIn.current = false;
        return setError(errorText(r));
      }
      userId = r.session.userId;
    } else {
      // Prototype: the sample email signs in as Dara (sample invitations); anyone else starts empty.
      userId = address === sampleUser.email ? sampleUser.id : `user_${address}`;
      signInMock({ userId, email: address, provider: "email" });
    }
    const existing = await listInvitations(userId).catch(() => []);
    router.push(existing.length > 0 ? "/app" : "/app/new");
  }

  async function google() {
    signingIn.current = true;
    if (USE_SUPABASE) {
      setBusy(true);
      const r = await auth.signInWithGoogle("/app"); // leaves the page on success
      if (!r.ok) {
        setBusy(false);
        signingIn.current = false;
        setError(errorText(r));
      }
      return;
    }
    signInMock({ userId: "user_google", provider: "google" });
    router.push("/app");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col">
      <div className="px-3 py-3">
        <TopBar backHref="/" />
      </div>

      <div className="flex flex-col items-center px-6 pt-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-[18px] bg-maroon text-gold">
          <LotusMark size={34} />
        </span>
        <h1 className="mt-[18px] mb-1 text-2xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted">
          {step === "otp" ? (
            <>
              {c.subOtp} <span lang="en" className="font-semibold break-all text-charcoal">{address}</span>
            </>
          ) : (
            c.subEmail
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3.5 px-6 pt-7">
        {step === "email" ? (
          <form
            className="flex flex-col gap-3.5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
          >
            <label htmlFor="email" className="text-sm font-semibold">{c.email}</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={c.emailPh}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "email-error" : undefined}
              className="min-h-[52px] w-full min-w-0 rounded-card border-[1.5px] border-line-strong bg-white px-3.5 text-[17px] outline-none focus:border-maroon aria-invalid:border-maroon"
            />
            {showEmailError && <p id="email-error" className="text-[13px] text-maroon">{c.emailError}</p>}
            <Button type="submit" fullWidth disabled={busy} className="min-h-[52px]">{busy ? c.wait : c.send}</Button>
            {!USE_SUPABASE && (
              <button
                type="button"
                onClick={() => setEmail(sampleUser.email)}
                className="min-h-11 cursor-pointer text-[13px] text-maroon underline"
              >
                {c.demo}
              </button>
            )}
          </form>
        ) : (
          <form
            className="flex flex-col gap-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <label htmlFor="otp" className="text-sm font-semibold">{c.code}</label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="••••••"
              value={otp}
              autoFocus
              aria-describedby="otp-hint"
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="min-h-[52px] w-full rounded-card border-[1.5px] border-line-strong bg-white px-3.5 text-center text-2xl font-bold tracking-[0.6em] outline-none focus:border-maroon"
            />
            <p id="otp-hint" className="text-center text-[13px] text-muted">{USE_SUPABASE ? c.codeHint : c.hint}</p>
            <Button type="submit" fullWidth disabled={!otpOk || busy} className="min-h-[52px]">{busy ? c.wait : c.cont}</Button>
            <div className="flex flex-wrap items-center justify-center gap-x-4 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError("");
                }}
                className="min-h-11 cursor-pointer text-maroon"
              >
                {c.change}
              </button>
              {seconds > 0 ? (
                <span className="text-muted" aria-live="off">{c.resendIn} {countdown}</span>
              ) : (
                <button type="button" onClick={() => sendCode(true)} disabled={busy} className="min-h-11 cursor-pointer text-maroon">
                  {c.resend}
                </button>
              )}
            </div>
            <p role="status" className="text-center text-[13px] text-jade-ink">{notice}</p>
          </form>
        )}

        {error && <p role="alert" className="rounded-card bg-rose-soft px-3 py-2 text-[13px] text-maroon">{error}</p>}

        <div className="my-1.5 flex items-center gap-3 text-[13px] text-muted">
          <div className="h-px grow bg-line-strong" />
          <span>{c.or}</span>
          <div className="h-px grow bg-line-strong" />
        </div>

        <Button
          variant="secondary"
          fullWidth
          onClick={google}
          disabled={busy}
          className="min-h-[52px] gap-2.5 border-line-strong text-charcoal hover:bg-sand-light"
        >
          <GoogleIcon />
          {c.google}
        </Button>
      </div>

      <p className="mt-auto p-6 text-center text-xs text-muted">{c.terms}</p>
    </main>
  );
}
