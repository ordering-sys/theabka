"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE, Stagger, StaggerItem } from "@/components/motion/Motion";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/ui/Icons";
import { LotusMark } from "@/components/ui/Header";
import { TopBar } from "@/components/ui/TopBar";
import { useSession } from "@/components/dashboard/RequireSession";
import * as auth from "@/lib/auth/client";
import { useContent, useLanguage } from "@/lib/i18n";
import { toKhmerNumerals } from "@/lib/khmer";
import { listInvitations } from "@/lib/store";

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
    cont: "Continue",
    change: "Use a different email",
    resendIn: "Resend in",
    resend: "Resend code",
    resent: "New code sent",
    or: "or",
    google: "Continue with Google",
    terms: { before: "By continuing you agree to the ", terms: "Terms of Service", and: " and ", privacy: "Privacy Policy", after: "" },
    emailError: "Enter a valid email address, like name@example.com",
    wait: "Please wait…",
    errors: {
      invalid_email: "That doesn't look like a valid email address.",
      invalid_code: "That code is wrong or has expired. Check your email or send a new code.",
      rate_limited: "Too many tries. Please wait a minute and try again.",
      failed: "Something went wrong. Please try again.",
      oauth_denied: "Google sign-in was cancelled. Try again, or use your email instead.",
      oauth_failed: "We couldn't sign you in with Google. Try again, or use your email instead.",
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
    cont: "បន្ត",
    change: "ប្រើអ៊ីមែលផ្សេង",
    resendIn: "ផ្ញើម្ដងទៀតក្នុង",
    resend: "ផ្ញើលេខកូដម្ដងទៀត",
    resent: "បានផ្ញើលេខកូដថ្មី",
    or: "ឬ",
    google: "បន្តជាមួយ Google",
    terms: { before: "ដោយបន្ត អ្នកយល់ព្រម", terms: "លក្ខខណ្ឌប្រើប្រាស់", and: " និង", privacy: "គោលការណ៍ឯកជនភាព", after: "" },
    emailError: "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលត្រឹមត្រូវ ឧ. name@example.com",
    wait: "សូមរង់ចាំ…",
    errors: {
      invalid_email: "អាសយដ្ឋានអ៊ីមែលនេះមិនត្រឹមត្រូវទេ។",
      invalid_code: "លេខកូដមិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមពិនិត្យអ៊ីមែល ឬផ្ញើលេខកូដថ្មី។",
      rate_limited: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំមួយនាទី ហើយព្យាយាមម្ដងទៀត។",
      failed: "មានបញ្ហាមួយ។ សូមព្យាយាមម្ដងទៀត។",
      oauth_denied: "ការចូលគណនីតាម Google ត្រូវបានបោះបង់។ សូមព្យាយាមម្ដងទៀត ឬប្រើអ៊ីមែលរបស់អ្នកជំនួសវិញ។",
      oauth_failed: "យើងមិនអាចចូលគណនីរបស់អ្នកតាម Google បានទេ។ សូមព្យាយាមម្ដងទៀត ឬប្រើអ៊ីមែលរបស់អ្នកជំនួសវិញ។",
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
  // Set when Google sign-in bounces back with /signin?error=… (see app/auth/google/callback).
  const [oauthError, setOauthError] = useState<"oauth_denied" | "oauth_failed" | null>(null);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    // Read after hydration; useSearchParams would need a Suspense boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (code === "oauth_denied" || code === "oauth_failed") setOauthError(code);
  }, []);
  const shownError = error || (oauthError ? c.errors[oauthError] : "");

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
    setOauthError(null);
    setBusy(true);
    const r = await auth.sendEmailOtp(address);
    setBusy(false);
    if (!r.ok) return setError(errorText(r));
    setStep("otp");
    setOtp("");
    setSeconds(RESEND_SECONDS);
    setNotice(resend ? c.resent : "");
  }

  async function verify() {
    if (!otpOk || busy) return;
    setError("");
    signingIn.current = true;
    setBusy(true);
    const r = await auth.verifyEmailOtp(address, otp);
    if (!r.ok || !r.session) {
      setBusy(false);
      signingIn.current = false;
      return setError(errorText(r));
    }
    const existing = await listInvitations(r.session.userId).catch(() => []);
    router.push(existing.length > 0 ? "/app" : "/app/new");
  }

  async function google() {
    signingIn.current = true;
    setOauthError(null);
    setBusy(true);
    const r = await auth.signInWithGoogle("/app"); // leaves the page on success
    if (!r.ok) {
      setBusy(false);
      signingIn.current = false;
      setError(errorText(r));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col">
      <div className="px-3 py-3">
        <TopBar backHref="/" />
      </div>

      <Stagger onMount stagger={0.08} className="flex flex-col items-center px-6 pt-4 text-center">
        <StaggerItem variant="popIn" className="flex size-16 items-center justify-center rounded-[18px] bg-maroon text-gold">
          <motion.span
            className="flex"
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.6 }}
          >
            <LotusMark size={34} />
          </motion.span>
        </StaggerItem>
        <StaggerItem as="h1" className="mt-[18px] mb-1 text-2xl font-bold">{c.title}</StaggerItem>
        <StaggerItem as="p" className="text-sm text-muted">
          {step === "otp" ? (
            <>
              {c.subOtp} <span lang="en" className="font-semibold break-all text-charcoal">{address}</span>
            </>
          ) : (
            c.subEmail
          )}
        </StaggerItem>
      </Stagger>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
        className="flex flex-col gap-3.5 px-6 pt-7"
      >
        <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.form
            key="email"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: EASE }}
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
          </motion.form>
        ) : (
          <motion.form
            key="otp"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: EASE }}
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
            <p id="otp-hint" className="text-center text-[13px] text-muted">{c.codeHint}</p>
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
          </motion.form>
        )}
        </AnimatePresence>

        <AnimatePresence>
          {shownError && (
            <motion.p
              key="error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", x: [0, -6, 6, -3, 0] }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-card bg-rose-soft px-3 py-2 text-[13px] text-maroon"
            >
              {shownError}
            </motion.p>
          )}
        </AnimatePresence>

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
      </motion.div>

      <p className="mt-auto p-6 text-center text-xs text-muted">
        {c.terms.before}
        <Link href="/terms" className="underline hover:text-maroon">{c.terms.terms}</Link>
        {c.terms.and}
        <Link href="/privacy" className="underline hover:text-maroon">{c.terms.privacy}</Link>
        {c.terms.after}
      </p>
    </main>
  );
}
