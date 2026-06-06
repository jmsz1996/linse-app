"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { useT } from "@/components/guest/locale-provider";

interface PasswordGateProps {
  slug: string;
}

export function PasswordGate({ slug }: PasswordGateProps) {
  const router = useRouter();
  const t = useT();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A pending recovery token (from the recovery link, carried in the hash).
  // When set, a successful unlock resumes recovery instead of showing register.
  const recoveryToken = useRef<string | null>(null);
  const autoTried = useRef(false);

  async function submit(pw: string) {
    if (!pw || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/e/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      if (!res.ok) {
        setError(
          res.status === 429
            ? t.entry.tooManyAttempts
            : res.status === 401
              ? t.entry.wrongPassword
              : t.errors.generic
        );
        setIsSubmitting(false);
        return;
      }

      if (recoveryToken.current) {
        // Resume the recovery the user came in with; the server sets the guest
        // cookie and redirects to the feed now that the gate is passed.
        window.location.href = `/api/e/${slug}/recover?t=${recoveryToken.current}`;
        return;
      }
      // Re-render the server page, now unlocked → reveals the register step.
      router.refresh();
    } catch {
      setError(t.errors.network);
      setIsSubmitting(false);
    }
  }

  // Read secrets carried in the URL hash exactly once: `#k=<password>` (from the
  // QR, auto-submitted) and/or `#rt=<recoveryToken>` (from the recovery link).
  // Strip them from the URL so they don't linger in browser history.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;

    const hash = window.location.hash;
    const rt = hash.match(/[#&]rt=([0-9a-f]{64})/);
    if (rt) recoveryToken.current = rt[1];
    const k = hash.match(/[#&]k=([^&]+)/);
    if (k || rt) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (k) {
      // Auto-submit the QR's embedded password. Deferred to a microtask so the
      // submit's setState doesn't run synchronously in the effect body. No need
      // to mirror it into the input — on success we refresh/redirect; on failure
      // the field stays empty for manual entry.
      const pw = decodeURIComponent(k[1]);
      queueMicrotask(() => void submit(pw));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(password);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Lock
          aria-hidden
          className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/55"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.entry.passwordPlaceholder}
          aria-label={t.entry.passwordPlaceholder}
          maxLength={128}
          required
          autoFocus
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-input bg-card pl-12 pr-5 text-[15px] shadow-soft outline-none transition placeholder:text-muted-foreground/55 focus:border-ring/40 focus:ring-2 focus:ring-ring/25"
        />
      </div>
      {error && <p className="px-1 text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !password}
        className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-[15px] font-semibold text-background shadow-soft transition active:scale-[0.99] disabled:opacity-40"
      >
        {isSubmitting ? (
          t.entry.unlocking
        ) : (
          <>
            {t.entry.unlockCta}
            <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
